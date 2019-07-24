<template>
  <div class="row">
    <template v-for="(properties, plan) in plans">
      <div :id="plan + '-card'" class="col-xs-12 col-sm-6 col-md-6 col-lg-3 col-xl-3" :key="plan">
        <q-card :color="properties.color" >     
          <q-card-section class="text-center">
            <h4>{{$t('plans.' + plan + '_LABEL', quotas[plan])}}</h4>
            <h5 slot="subtitle">{{$t('plans.' + plan + '_PRICE', quotas[plan])}}</h5>
          </q-card-section>
          <q-separator inset />
          <q-card-section class="text-center">
            <q-collapsible :label="$t('plans.' + plan + '_DESCRIPTION', quotas[plan])">
              <div v-html="$t('plans.' + plan + '_DETAILS', quotas[plan])" />
            </q-collapsible>
          </q-card-section>
          <q-separator />
          <q-card-actions align="end">
            <div v-if="properties.url || properties.route">
              <q-btn :id="plan+ '-action'" flat @click="onPlanChanged(plan, properties)">{{$t('KPlanChooser.CLICK')}}</q-btn>
            </div>
            <div v-else>
              <q-btn :id="plan+ '-action'" v-if="plan !== value" flat :disable="properties.stripeId && !hasCustomer" @click="onPlanChanged(plan, properties)">{{$t('KPlanChooser.SELECT')}}
                <q-tooltip v-if="properties.stripeId && !hasCustomer">
                  {{$t('KPlanChooser.PLAN_DISABLED_TOOLTIP')}}
                </q-tooltip>
              </q-btn>
              <q-btn :id="plan + '-action'" v-else flat disable>{{$t('KPlanChooser.CURRENT_PLAN')}}</q-btn>
            </div>
          </q-card-actions>
        </q-card>
      </div>
    </template>
  </div>
</template>

<script>
import { openURL, Dialog } from 'quasar'

export default {
  name: 'k-plan-chooser',
  props: {
    billingObjectId: {
      type: String,
      default: ''
    },
    billingObjectService: {
      type: String,
      default: ''
    },
    quotas: {
      type: Object,
      required: true
    },
    plans: {
      type: Object,
      required: true
    },
    value: {
      type: String,
      default: ''
    },
    hasCustomer: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    onPlanChanged (plan, properties) {
      if (properties.url) {
        openURL(properties.url)
      } else if (properties.route) {
        this.$router.push(properties.route)
      } else {
        // Ask confimation
        Dialog.create({
          title: this.$t('KPlanChooser.CONFIRM_DIALOG_TITLE'),
          message: this.$t('KPlanChooser.CONFIRM_DIALOG_MESSAGE', { plan: 'plans.' + plan + '_LABEL' }),
          ok: {
            label: this.$t('OK'),
          },
          cancel: {
            label: this.$t('CANCEL')
          }
        }).onOk(async () => {
          const billingService = this.$api.getService('billing')
          await billingService.update(this.billingObjectId, {
            action: 'subscription',
            plan: plan,
            billingObjectService: this.billingObjectService,
            billingPerspective: 'billing'
          })
          this.$emit('input', plan)
        })
      }
    }
  }
}
</script>

