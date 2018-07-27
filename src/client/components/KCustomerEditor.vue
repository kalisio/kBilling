<template>
  <k-modal ref="modal" :title="$t('KPaymentEditor.TITLE')" :toolbar="getToolbar()" :buttons="getButtons()" :route="false">
    <div slot="modal-content"> 
      <div class="column gutter-md">
        <div>
          <k-form ref="form" :schema="getSchema()" />
        </div>
        <div>
          <q-toggle class="k-toggle" icon="fa-retweet" v-model="hasCard" :label="$t('KPaymentEditor.CARD_TOGGLE_LABEL')" />
        </div>
        <div v-if="hasCard">
          <q-card>
            <div v-if="hasToken" class="row">
              <div class="col-11 self-center">
                <span>&nbsp;</span>
                <q-icon name="credit_card" />
                <span>&nbsp;XXXX-{{customer.card}}</span>
              </div>
              <div class="col-1">
                <q-btn flat round color="grey-7" @click="onCardCleared">
                  <q-icon name="cancel" />
                </q-btn>
              </div>
            </div>
            <div v-else class="row">
              <div class="col-11 self-center">
                <card class='k-stripe-card'
                stripe='pk_test_wheeY3y0i6ComzWo7YLd4b1W'
                :options='stripeOptions'
                @change='onCardUpdated' />
              </div>
              <div class="col-1 self-center">
                <q-spinner v-show="isUpdatingCard" color="grey-7" size="24px" />
              </div>
            </div>
          </q-card>
        </div>
      </div>
    </div>
  </k-modal>
</template>

<script>
import _ from 'lodash'
import { QToggle, QCard, QBtn, QIcon, QSpinner } from 'quasar-framework'
import { Card, createToken } from 'vue-stripe-elements-plus'
import { mixins as kCoreMixins } from 'kCore/client'

export default {
  name: 'k-customer-editor',
  components: {
    QToggle,
    QCard,
    QBtn,
    QIcon,
    QSpinner,
    Card
  },
  mixins: [
    kCoreMixins.refsResolver(['form'])
  ],
  props: {
    billingObjectId: {
      type: String,
      default: ''
    },
    billingService: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      hasCard: false,
      hasToken: false,
      isUpdatingCard: false,
      stripeOptions: {
        // see https://stripe.com/docs/stripe.js#element-options for details
      }
    }
  },
  methods: {
    getSchema () {
      return {
        '$schema': 'http://json-schema.org/draft-06/schema#',
        '$id': 'http://kalisio.xyz/schemas/edit-customer',
        'title': 'KPaymentEditor.TITLE',
        'type': 'object',
        'properties': {
          'email': {
            'type': 'string',
            'format': 'email',
            'field': {
              'component': 'form/KEmailField',
              'helper': 'KPaymentEditor.CUSTOMER_EMAIL_FIELD_HELPER'
            }
          },
          'description': {
            'type': 'string',
            'field': {
              'component': 'form/KTextareaField',
              'helper': 'KPaymentEditor.CUSTOMER_DESCRIPTION_FIELD_HELPER'
            }
          },
          'business_vat_id': {
            'type': 'string',
            'field': {
              'component': 'form/KTextField',
              'helper': 'KPaymentEditor.CUSTOMER_VAT_FIELD_HELPER'
            }
          }
        },
        'required': ['email']
      }
    },
    getToolbar () {
      return [
        { name: 'close-action', label: this.$t('KPaymentEditor.CLOSE_ACTION'), icon: 'close', handler: () => this.close() }
      ]
    },
    getButtons () {
      return [
        { name: 'update-button', label: this.$t('KPaymentEditor.UPDATE_BUTTON'), color: 'primary', handler: (event, done) => this.onUpdateClicked(event, done) }
      ]
    },
    open (customer) {
      // Initialize the editor
      if (!_.isNil(customer)) this.customer = Object.assign(customer)
      else {
        this.customer = {
          email: this.$store.get('user.description'),
          description: this.$store.get('context.name')
        }
      }
      this.hasToken = this.customer.token
      this.hasCard = this.hasCard

      // Open the editor
      this.$refs.modal.open()
      // Fill the editor
      this.$refs.form.fill(this.customer)
    },
    close (onClose) {
      this.$refs.modal.close(onClose)
    },
    onUpdateClicked (event, done) {
      let result = this.$refs.form.validate()
      if (result.isValid) {
        this.customer = Object.assign(this.customer, result.values)

        const billingService = this.$api.getService('billing')
        billingService.create(Object.assign(this.customer, {
          action: 'customer',
          billingObjectId: this.billingObjectId,
          billingService: this.billingService
        }))
        this.close(done())
      } else {
        done()
      }
    },
    onCardUpdated (card) {
      if (card.complete) {
        this.isUpdatingCard = true
        createToken(card).then(data => {
          if (!_.isNil(data.token)) {
            this.customer.token = data.token.id
            this.customer.card = data.token.card.last4
            this.hasToken = true
          }
          this.isUpdatingCard = false
        })
      }
    },
    onCardCleared () {
      _.unset(this.customer.token)
      _.unset(this.customer.card)
      this.hasToken = false
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-modal'] = this.$load('frame/KModal')
    this.$options.components['k-form'] = this.$load('form/KForm')
  }
}
</script>

<style>
.k-toggle {
  margin-top: 2rem;
  margin-bottom: 2rem
}
.k-stripe-card {
  margin: 8px;
}
</style>
