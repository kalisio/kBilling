import _ from 'lodash'
import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio, hooks as coreHooks, permissions as corePermissions } from 'kCore'
import { iffElse, when } from 'feathers-hooks-common'
import team, { hooks as teamHooks, permissions as teamPermissions } from 'kTeam'
import billing, { billingHooks } from '../src'

describe('kBilling', () => {
  let app, server, port,
    userService, userObject, billingService, paymentObject,
    adminDb, orgService, authorisationService, orgGroupService, orgUserService, orgStorageService,
    joinedOrgUserService, user1Object, user2Object, user3Object, orgObject, groupObject

  before(() => {
    chailint(chai, util)

    // Register all default hooks for authorisation
    // Default rules for all users
    corePermissions.defineAbilities.registerHook(corePermissions.defineUserAbilities)
    // Then rules for organisations
    corePermissions.defineAbilities.registerHook(teamPermissions.defineOrganisationAbilities)
    // Then rules for groups
    corePermissions.defineAbilities.registerHook(teamPermissions.defineGroupAbilities)
    // Then rules for billing
    // TODO

    app = kalisio()
    port = app.get('port')
    // Register authorisation hook
    app.hooks({
      before: { all: [coreHooks.processObjectIDs, coreHooks.authorise] },
      after: { remove: [billingHooks.removePayment, coreHooks.authorise] }
      /* For debug
      before: { all: [coreHooks.log, teamHooks.authorise] },
      after: { all: coreHooks.log },
      error: { all: coreHooks.log }
      */
    })
    // Add hooks for contextual services
    app.on('service', service => {
      if (service.name === 'groups') {
        service.hooks({
          after: {
            create: [ teamHooks.createGroupAuthorisations ],
            remove: [ coreHooks.setAsDeleted, teamHooks.removeGroupAuthorisations ]
          }
        })
      }
    })
    return app.db.connect()
    .then(db => {
      adminDb = app.db.instance.admin()
    })
  })

  it('is CommonJS compatible', () => {
    expect(typeof core).to.equal('function')
  })

  it('registers the services', (done) => {
    app.configure(core)
    app.configure(billing)

    userService = app.getService('users')
    expect(userService).toExist()

    billingService = app.getService('billing')
    expect(billingService).toExist()

    userService.hooks({
      before: {
        remove: [ teamHooks.preventRemoveUser ]
      },
      after: {
        create: [
          iffElse(hook => hook.result.sponsor, teamHooks.joinOrganisation, teamHooks.createPrivateOrganisation)
        ],
        remove: [ coreHooks.setAsDeleted, teamHooks.leaveOrganisations() ]
      }
    })

    app.configure(team)
    orgService = app.getService('organisations')
    expect(orgService).toExist()
    orgService.hooks({
      before: {
        remove: [ teamHooks.preventRemoveOrganisation ]
      },
      after: {
        create: [ teamHooks.createOrganisationServices, teamHooks.createOrganisationAuthorisations ],
        remove: [ coreHooks.setAsDeleted, teamHooks.removeOrganisationGroups, teamHooks.removeOrganisationAuthorisations, teamHooks.removeOrganisationServices ]
      }
    })
    authorisationService = app.getService('authorisations')
    expect(authorisationService).toExist()
    authorisationService.hooks({
      before: {
        create: [ when(hook => hook.params.resource,
          teamHooks.preventRemovingLastOwner('organisations'),
          teamHooks.preventRemovingLastOwner('groups'))
        ],
        remove: [ when(hook => hook.params.resource && !hook.params.resource.deleted,
          teamHooks.preventRemovingLastOwner('organisations'),
          teamHooks.preventRemovingLastOwner('groups'))
        ]
      },
      after: {
        remove: [ when(hook => _.get(hook.params, 'query.scope') === 'organisations',
          teamHooks.removeOrganisationGroupsAuthorisations)
        ]
      }
    })



    // Now app is configured launch the server
    server = app.listen(port)
    server.once('listening', _ => done())
  })

  it('unregistered users cannot create organisations', (done) => {
    orgService.create({ name: 'test-org' }, { checkAuthorisation: true })
    .catch(error => {
      expect(error).toExist()
      expect(error.name).to.equal('Forbidden')
      done()
    })
    /*
    request
    .post(`${baseUrl}/organisations`)
    .send({ name: 'test-org' })
    .then(response => {
      console.log(response)
      expect(response).toExist()
    })
    */
  })

  it('creates a test user', () => {
    return userService.create({ email: 'test-1@test.org', name: 'test-user-1' }, { checkAuthorisation: true })
    .then(user => {
      user1Object = user
      return userService.find({ query: { 'profile.name': 'test-user-1' }, checkAuthorisation: true, user: user1Object })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('creates a private organisation on user registration', () => {
    return userService.create({ email: 'test-2@test.org', name: 'test-user-2' }, { checkAuthorisation: true })
    .then(user => {
      user2Object = user
      expect(user2Object.organisations).toExist()
      // By default the user manage its own organisation
      expect(user2Object.organisations[0].permissions).to.deep.equal('owner')
      return orgService.find({ query: { 'name': 'test-user-2' }, user: user2Object, checkAuthorisation: true })
    })
    .then(orgs => {
      expect(orgs.data.length > 0).beTrue()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('invites a user to join an organisation', () => {
    let sponsor = { id: user2Object._id, organisationId: user2Object.organisations[0]._id, roleGranted: 'member' }
    return userService.create({ email: 'test-3@test.org', name: 'test-user-3', sponsor: sponsor }, { checkAuthorisation: true })
    .then(user => {
      user3Object = user
      expect(user3Object.organisations).toExist()
      // By default the user manage its own organisation
      expect(user3Object.organisations[0].permissions).to.deep.equal('member')
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('creates an organisation', () => {
    return orgService.create({ name: 'test-org' }, { user: user1Object, checkAuthorisation: true })
    .then(org => {
      return orgService.find({ query: { name: 'test-org' }, user: user1Object, checkAuthorisation: true })
    })
    .then(orgs => {
      expect(orgs.data.length > 0).beTrue()
      orgObject = orgs.data[0]
      expect(orgObject.name).to.equal('test-org')
      // This should create a service for organisation groups
      orgGroupService = app.getService('groups', orgObject)
      expect(orgGroupService).toExist()
      // This should create a service for organisation users
      orgUserService = app.getService('members', orgObject)
      expect(orgUserService).toExist()

      // We do not test creation of the DB here since MongoDB does not actually
      // creates it until the first document has been inserted (see next tests)
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('checks the subjects as owner on this organisation', () => {
    return teamPermissions.findMembersOfOrganisation(userService, orgObject._id, corePermissions.Roles.owner)
    .then(members => {
      expect(members.data.length === 1).beTrue()
      expect(members.data[0]._id.toString()).to.deep.equal(user1Object._id.toString())
    })
  })

  it('create a payment', async () => {
    paymentObject = await billingService.create({
      action: 'payment',
      customerEmail: 'customer@kalisio.xyz',
      customerDescription: 'A customer'
    })
    expect(paymentObject.id).toExist()
  })
  // Let enough time to process
  .timeout(5000)

  it('removes the payment', async () => {
    await billingService.remove(paymentObject.id, {
      query: {
        action: 'payment'
      }
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('restore organisation group to prepare testing org cleanup', () => {
    return orgGroupService.create({ name: 'test-group' }, { user: user1Object, checkAuthorisation: true })
    .then(() => {
      return orgGroupService.find({ query: { name: 'test-group' }, user: user1Object, checkAuthorisation: true })
    })
    .then(groups => {
      expect(groups.data.length > 0).beTrue()
      groupObject = groups.data[0]
      return authorisationService.create({
        scope: 'groups',
        permissions: 'member',
        subjects: user2Object._id.toString(),
        subjectsService: 'users',
        resource: groupObject._id.toString(),
        resourcesService: orgObject._id.toString() + '/groups'
      }, {
        user: user1Object,
        checkAuthorisation: true
      })
    })
    .then(authorisation => {
      expect(authorisation).toExist()
      return userService.find({ query: { 'profile.name': user2Object.name }, checkAuthorisation: true, user: user1Object })
    })
    .then(users => {
      user2Object = users.data[0]
      expect(user2Object.groups[0]._id.toString()).to.equal(groupObject._id.toString())
      expect(user2Object.groups[0].permissions).to.equal('member')
    })
  })
  // Let enough time to process
  .timeout(10000)

  it('owner can remove organisation members', () => {
    return authorisationService.remove(orgObject._id, {
      query: {
        scope: 'organisations',
        subjects: user2Object._id.toString(),
        subjectsService: 'users',
        resourcesService: 'organisations'
      },
      user: user1Object,
      checkAuthorisation: true
    })
    .then(authorisation => {
      expect(authorisation).toExist()
      return userService.find({ query: { 'profile.name': user2Object.name }, checkAuthorisation: true, user: user1Object })
    })
    .then(users => {
      user2Object = users.data[0]
      // No more permission set for org groups
      expect(_.find(user2Object.groups, group => group._id.toString() === groupObject._id.toString())).beUndefined()
      // No more permission set for org
      expect(_.find(user2Object.organisations, org => org._id.toString() === orgObject._id.toString())).beUndefined()
      // Only private org remains
      expect(_.find(user2Object.organisations, org => org._id.toString() === user2Object._id.toString())).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('owner can remove organisation', () => {
    return orgGroupService.remove(groupObject._id, { user: user1Object, checkAuthorisation: true })
    .then(() => {
      return userService.get(user1Object._id)
    })
    .then(user => {
      user1Object = user
      return orgService.remove(orgObject._id, { user: user1Object, checkAuthorisation: true })
    })
    .then(() => {
      return orgService.find({ query: { name: 'test-org' }, user: user1Object, checkAuthorisation: true })
    })
    .then(orgs => {
      expect(orgs.data.length === 0).beTrue()
      return userService.find({ query: {}, checkAuthorisation: true, user: user1Object })
    })
    .then(users => {
      expect(users.data.length === 3).beTrue()
      user1Object = users.data[0]
      // No more permission set for org groups
      expect(_.find(user1Object.groups, group => group._id.toString() === groupObject._id.toString())).beUndefined()
      // No more permission set for org
      expect(_.find(user1Object.organisations, org => org._id.toString() === orgObject._id.toString())).beUndefined()
      // Should remove associated DB
      return adminDb.listDatabases()
    })
    .then(dbs => {
      expect(dbs.databases.find(db => db.name === orgObject._id.toString())).beUndefined()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('removes joined user', () => {
    return orgService.find({ query: { name: user2Object.name }, user: user2Object, checkAuthorisation: true })
    .then(orgs => {
      expect(orgs.data.length > 0).beTrue()
      joinedOrgUserService = app.getService('members', orgs.data[0])
      return userService.remove(user3Object._id, { user: user3Object, checkAuthorisation: true })
    })
    .then(user => {
      return userService.find({ query: { name: user3Object.name }, user: user3Object, checkAuthorisation: true })
    })
    .then(users => {
      expect(users.data.length === 0).beTrue()
      return joinedOrgUserService.find({ query: { name: user3Object.name }, user: user2Object, checkAuthorisation: true })
    })
    .then(users => {
      // User is not found on the joined org service
      expect(users.data.length === 0).beTrue()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('prevent remove user while owning organisation', (done) => {
    userService.remove(user2Object._id, { user: user2Object, checkAuthorisation: true })
    .catch(error => {
      expect(error).toExist()
      expect(error.name).to.equal('Forbidden')
      done()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('remove private users private organisations before deletion', () => {
    return orgService.remove(user1Object._id, { user: user1Object, checkAuthorisation: true })
    .then(() => {
      return userService.get(user1Object._id)
    })
    .then(user => {
      user1Object = user
    })
    .then(() => {
      return orgService.remove(user2Object._id, { user: user2Object, checkAuthorisation: true })
    })
    .then(() => {
      return userService.get(user2Object._id)
    })
    .then(user => {
      user2Object = user
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('remove users', () => {
    return userService.remove(user1Object._id, { user: user1Object, checkAuthorisation: true })
    .then(() => {
      return userService.find({ query: { name: user1Object.name }, user: user1Object, checkAuthorisation: true })
    })
    .then(users => {
      expect(users.data.length === 0).beTrue()
    })
    .then(() => {
      return userService.remove(user2Object._id, { user: user2Object, checkAuthorisation: true })
    })
    .then(() => {
      return userService.find({ query: { name: user2Object.name }, user: user2Object, checkAuthorisation: true })
    })
    .then(users => {
      expect(users.data.length === 0).beTrue()
    })
  })
  // Let enough time to process
  .timeout(5000)

  // Cleanup
  after(() => {
    if (server) server.close()
    userService.Model.drop()
  })
})
