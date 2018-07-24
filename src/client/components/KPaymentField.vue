<template>
  <div>
    <q-field
      :icon="icon"
      :label="label"
      :helper="helper"
      :error-label="errorLabel"
      :label-width="labelWidth"
      :error="hasError"
    >
      <q-select
        :id="properties.name + '-field'"
        :multiple="false"
        :toggle="false"
        :radio="true"
        :chips="false"
        v-model="model"
        :options="options"
        :after="actions"
        @change="onChanged"
        @blur="onChanged" />
    </q-field>
    <k-payment-card-editor ref="paymentCardEditor" />
  </div>
</template>

<script>
import _ from 'lodash'
import { QField, QSelect } from 'quasar'
import { mixins as kCoreMixins } from 'kCore/client'

export default {
  name: 'k-payment-field',
  components: {
    QField,
    QSelect
  },
  mixins: [kCoreMixins.baseField],
  computed: {
    options () {
      return [
        { 'label': this.$t('KPaymentField.INVOICE_METHOD_LABEL'), 'value': 'invoice' },
        { 'label': this.$t('KPaymentField.CARD_METHOD_LABEL'), 'value': 'card' }
      ]
    },
    actions () {
      if (this.model === 'card') return [ { icon: 'credit_card',  content: true, handler: () => this.updateCardPayment() } ]
      return [ { icon: 'mail',  content: true, handler: () => this.updateInvoicePayment() } ]
    }
  },
  methods: {
    emptyModel () {
      return {}
    },
    updateCardPayment () {
      this.$refs.paymentCardEditor.open()
    },
    updateInvoicePayment () {

    }
  },
  created () {
    // Load the required components
    this.$options.components['k-payment-card-editor'] = this.$load('KPaymentCardEditor')
  }
}
</script>
