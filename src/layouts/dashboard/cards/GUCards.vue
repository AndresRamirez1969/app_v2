//Cards de Usuario General
<script setup>
    import { ref, onMounted, computed } from 'vue';
    import { mdiClipboardText, mdiAccountGroup, mdiCheckCircle, mdiClockOutline, mdiArrowUp, mdiArrowDown } from '@mdi/js';
    import axiosInstance from '@/utils/axios';
    
    const counts = ref({
        organizations: 0,
        businesses: 0,
        users: 0,
        business_units: 0, 
    });
    
    const fetchCards = async () => {
        const { data } = await axiosInstance.get('/dashboard/overview');
        if (data.counts) {
            counts.value = {
                organizations: data.counts.organizations || 0,
                businesses: data.counts.businesses || 0,
                business_units: data.counts.business_units || 0,
                users: data.counts.users || 0
            };
        }
        console.log(counts.value);
    };
    
    onMounted(() => {
        fetchCards();
    });
    
    const cards = computed(() => [
        {
            id: 1,
            icon: mdiClipboardText,
            value: counts.value.organizations,
            label: 'Organizaciones',
            change: {
               
                isPositive: true
            },
            borderColor: 'primary',
        },
        {
            id: 2,
            icon: mdiAccountGroup,
            value: counts.value.users,
            label: 'Usuarios activos',
            change: {
                isPositive: true
            },
            borderColor: 'info',
        },
        {
            id: 3,
            icon: mdiCheckCircle,
            value: counts.value.businesses,
            label: 'Negocios',
            change: {
                isPositive: true
            },
            borderColor: 'success',
        },
        {
            id: 4,
            icon: mdiClockOutline,
            value: counts.value.business_units,
            label: 'Unidades de negocio',
            change: {
                isPositive: false
            },
            borderColor: 'warning',
        }
    ]);
    </script>
    
    <template>
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