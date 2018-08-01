<template>
  <k-modal ref="modal" :title="$t('KPaymentEditor.TITLE')" :toolbar="getToolbar()" :buttons="getButtons()" :route="false">
    <div slot="modal-content"> 
      <div class="column gutter-md">
        <div>
          <k-form ref="form" :schema="getSchema()" />
        </div>
        <div>
          <q-card>
            <div v-if="hasCard" class="row">
              <div class="col-11 self-center">
                <span>&nbsp;</span>
                <q-icon name="credit_card" />
                <span>&nbsp;XXXX-{{customer.card.last4}}</span>
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
                <q-spinner v-show="isCreatingCard" color="grey-7" size="24px" />
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
import { QCard, QBtn, QIcon, QSpinner } from 'quasar-framework'
import { Card, createToken } from 'vue-stripe-elements-plus'
import { mixins as kCoreMixins } from 'kCore/client'

export default {
  name: 'k-customer-editor',
  components: {
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
    billingObjectService: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      hasCard: false,
      isCreatingCard: false,
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
              'helper': 'KPaymentEditor.CUSTOMER_VAT_NUMBER_FIELD_HELPER'
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
      this.customer = Object.assign({
        action: 'customer',
        billingObjectId: this.billingObjectId,
        billingObjectService: this.billingObjectService
      }, customer)
      if (!_.isNil(this.customer.card)) this.hasCard = true
      // Open the editor
      this.$refs.modal.open()
      // Fill the editor
      this.$refs.form.fill(this.customer)
    },
    close (onClose) {
      this.$refs.modal.close(onClose)
    },
    async onUpdateClicked (event, done) {
      let result = this.$refs.form.validate()
      if (result.isValid) {
        // Update the customer values
        this.customer = Object.assign(this.customer, result.values)
        // Update the customer biling object
        const billingService = this.$api.getService('billing')
        let response = {}
        if (_.isNil(this.customer.id)) {
          response = await billingService.create(this.customer)
        } else {
          response = await billingService.update(this.customer.id, this.customer)
        }
        this.$emit('customer-updated', response)
        this.close(done())
      } else {
        done()
      }
    },
    onCardUpdated (card) {
      if (card.complete) {
        this.isCreatingCard = true
        createToken(card).then(data => {
          if (!_.isNil(data.token)) {
            this.customer.card = {
              id: data.token.id,
              last4: data.token.card.last4
            }
            this.hasCard = true
          }
          this.isCreatingCard = false
        })
      }
    },
    onCardCleared () {
      _.unset(this.customer, 'card')
      console.log(this.customer)
      this.hasCard = false
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