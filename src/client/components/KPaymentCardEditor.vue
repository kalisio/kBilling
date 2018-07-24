<template>
  <k-modal ref="modal" :title="$t('KPaymentCardEditor.TITLE')" :toolbar="getToolbar()" :buttons="getButtons()">
    <div slot="modal-content" class="column xs-gutter">
      <center>
          <card class='stripe-card'
          stripe='pk_test_XXXXXXXXXXXXXXXXXXXXXXXX'
          :options='stripeOptions'
          @change='complete = $event.complete' />
      </center>
      </div>
  </k-modal>
</template>

<script>
import { Card } from 'vue-stripe-elements-plus'

export default {
  name: 'k-payment-card-editor',
  components: { 
    Card 
  },
  data () {
    return {
      complete: false,
      stripeOptions: {
        // see https://stripe.com/docs/stripe.js#element-options for details
      }
    }
  },
  methods: {
    getToolbar () {
      return [
        { name: 'close-action', label: this.$t('KPaymentCardEditor.CLOSE_ACTION'), icon: 'close', handler: () => this.doClose() }
      ]
    },
    getButtons () {
      return [
        { name: 'update-button', label: this.$t('KPaymentCardEditor.UPDATE_BUTTON'), color: 'primary', handler: (event, done) => this.doUpdate(event, done) }
      ]
    },
    open () {
      this.$refs.modal.open()
    },
    doUpdate (event, done) {
      done()
    },
    doClose () {
      this.$refs.modal.close()
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-modal'] = this.$load('frame/KModal')
  }
}
</script>

<style>
.stripe-card {
  width: 95%;
  border-bottom: 1px solid grey;
}
.stripe-card.complete {
  width: 95%;
  border-bottom: 1px solid green
}
</style>
