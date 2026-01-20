//Cards de Usuario General
<script setup>
    import { ref, onMounted, computed, watch } from 'vue';
    import { mdiAccountGroup, mdiCheckCircle, mdiClockOutline, mdiArrowUp, mdiArrowDown } from '@mdi/js';
    import axiosInstance from '@/utils/axios';
    

    const props = defineProps({
      selectedOrganizationId: {
        type: Number,
        default: null
      },
      dateRange: {
        type: Object,
        default: () => ({ start: null, end: null})
      }
    });

    const scope = ref('');
    const completion = ref({
        start_date: null,
        end_date: null,
        expected: 0,
        completed: 0,
        rate: 0,
    });

    const getTodayDate = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const fetchCards = async () => {
      if (!props.selectedOrganizationId) {
        scope.value = '';
        completion.value = {
          start_date: null,
          end_date: null,
          expected: 0,
          completed: 0,
          rate: 0,
        };
        return;
      }
      try {

        const startDate = props.dateRange.start || getTodayDate();
        const endDate = props.dateRange.end || getTodayDate();

        const params = {
            organization_id: props.selectedOrganizationId,
            start_date: startDate,
            end_date: endDate,
            per_page: 100,
            page: 1,
        };
        const { data } = await axiosInstance.get('/dashboard/completion', { params });

        if (data.scope && data.completion) {
            scope.value = data.scope;
            completion.value = {
                start_date: data.completion.start_date || null,
                end_date: data.completion.end_date || null,
                expected: data.completion.expected || 0,
                completed: data.completion.completed || 0,
                rate: data.completion.rate || 0,
            };
        }
        console.log(scope.value, completion.value);
      } catch (error) {
        console.error('Error fetching completion data:', error);
      }
    };
    
    watch(() => props.selectedOrganizationId, (newOrgId) => {
      if (newOrgId) {
        fetchCards();
      } else {
        scope.value = '';
        completion.value = {
          start_date: null,
          end_date: null,
          expected: 0,
          completed: 0,
          rate: 0,
        };
      }
    }, { immediate: false });

    watch(() => props.dateRange, () => {
      if (props.selectedOrganizationId) {
        fetchCards();
      }
    }, { deep: true });

    onMounted(() => {
      if (props.selectedOrganizationId) {
        fetchCards();
      }
    });
    

    const cards = computed(() => [
        {
            id: 2,
            icon: mdiAccountGroup,
            value: completion.value.expected,
            label: 'Esperados',
            change: {
                isPositive: true
            },
            borderColor: 'info',
        },
        {
            id: 3,
            icon: mdiCheckCircle,
            value: completion.value.completed,
            label: 'Completados',
            change: {
                isPositive: true
            },
            borderColor: 'success',
        },
        {
            id: 4,
            icon: mdiClockOutline,
            value: completion.value.rate,
            label: 'Tasa de completitud',
            change: {
                isPositive: false
            },
            borderColor: 'warning',
        }
    ]);
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