//Cards de Usuario General
<script setup>
    import { onMounted, computed, watch } from 'vue';
    import { mdiAccountGroup, mdiCheckCircle, mdiClockOutline, mdiArrowUp, mdiArrowDown } from '@mdi/js';
    import { useCompletionData } from '@/composables/useCompletionData';
    

    const props = defineProps({
      selectedOrganizationId: {
        type: Number,
        default: null
      },
      dateRange: {
        type: Object,
        default: () => ({ start: null, end: null})
      },
      frequency: {
        type: String,
        default: null
      }
    });

    const { completion, scope, fetchCompletion } = useCompletionData();

    watch(() => props.selectedOrganizationId, (newOrgId) => {
      if (newOrgId) {
        fetchCompletion(newOrgId, props.dateRange, props.frequency);
      } else {
        completion.value = {
          expected: 0,
          completed: 0,
          rate: 0,
          start_date: null,
          end_date: null,
          avg_time: 0
        };
        scope.value = '';
      }
    }, { immediate: false });

    watch(() => props.dateRange, () => {
      if (props.selectedOrganizationId) {
        fetchCompletion(props.selectedOrganizationId, props.dateRange, props.frequency);
      }
    }, { deep: true });

    onMounted(() => {
      if (props.selectedOrganizationId) {
        fetchCompletion(props.selectedOrganizationId, props.dateRange, props.frequency);
      }
    });

    const isMultiplePerDay = computed(() => props.frequency === 'multiple_per_day');

    const cards = computed(() => {
      const allCards = [
        {
          id: 2,
          icon: mdiAccountGroup,
          value: completion.value.expected,
          label: isMultiplePerDay.value ? 'Asignados' : 'Esperados',
          change: {
            isPositive: true
          },
          borderColor: 'info',
        },
        {
          id: 3,
          icon: mdiCheckCircle,
          value: completion.value.completed,
          label: isMultiplePerDay.value ? 'Respuestas' : 'Completados',
          change: {
            isPositive: true
          },
          borderColor: 'success',
        },
        {
          id: 4,
          icon: mdiCheckCircle,
          value: completion.value.rate,
          label: 'Tasa de completitud',
          change: {
            isPositive: false
          },
          borderColor: 'warning',
        },
        {
          id: 5,
          icon: mdiClockOutline,
          value: completion.value.avg_time + 's',
          label: 'Tiempo Promedio',
          change: {
            isPositive: false
          },
          borderColor: 'warning',
        }
      ];

      return allCards.filter(card => {
        if (isMultiplePerDay.value && card.id === 4) {
          return false;
        }
        return true;
      });
    });
    </script>
    
    <template v-if="props.selectedOrganizationId">
      <v-row class="ma-0">
        <v-col
          v-for="card in cards"
          :key="card.id"
          cols="12"
          sm="6"
          md="3"
          class="pa-2"
        >
          <v-card
            class="stat-card"
            elevation="0"
            :style="{ borderTop: `4px solid rgb(var(--v-theme-${card.borderColor}))` }"
          >
            <v-card-text class="pa-4 position-relative" style="background-color: rgb(var(--v-theme-surface));">
              <!-- Icono -->
              <div class="d-flex align-center justify-space-between mb-3">
                <v-icon
                  :icon="card.icon"
                  :color="card.borderColor"
                  size="32"
                />
                
                <!-- Indicador de cambio -->
                <v-chip
                  :color="card.change.isPositive ? 'success' : 'error'"
                  size="small"
                  variant="flat"
                  class="text-white"
                >
                  <template v-slot:prepend>
                    <v-icon
                      :icon="card.change.isPositive ? mdiArrowUp : mdiArrowDown"
                      size="14"
                      class="mr-1"
                    />
                  </template>
                  {{ card.change.value }}
                </v-chip>
              </div>
    
              <!-- Métrica -->
              <h2 class="text-h3 font-weight-bold mb-1">
                {{ card.value }}
              </h2>
    
              <!-- Etiqueta -->
              <p class="text-caption text-medium-emphasis mb-4">
                {{ card.label }}
              </p>
    
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
    
    <style lang="scss" scoped>
    .stat-card {
      border-radius: 8px;
      overflow: hidden;
      
      .v-card-text {
        min-height: 100px;
        display: flex;
        flex-direction: column;
      }
    }
    </style>