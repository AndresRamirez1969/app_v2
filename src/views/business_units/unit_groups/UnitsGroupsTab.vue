<template>
  <v-container fluid class="pa-0">
    <v-row align="center" justify="space-between" class="ma-0 px-3 py-2">
      <v-col cols="auto" class="pa-0 d-flex align-center">
        <h1 class="text-h4 text-md-h3 font-weight-bold ma-0">Grupos</h1>
      </v-col>
      <v-col cols="12" md="12">
        <UiParentCard title="Gestionar Grupos">
          <UnitsGroupsView />
          <template #action>
            <v-btn color="primary" class="mt-4 px-2 py-1 text-sm" variant="flat" @click="showGroupDialog = true">
              <v-icon start :icon="mdiPlus" /> Agregar<span class="d-none d-sm-inline">&nbsp;Grupo</span>
            </v-btn>
          </template>
        </UiParentCard>
      </v-col>
    </v-row>
  </v-container>
  <CreateUnitGroup v-model:dialog="showGroupDialog" @groupCreated="handleGroupCreated" />
</template>

<script setup>
import { ref } from 'vue';
import UnitsGroupsView from './UnitsGroupsView.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { mdiPlus } from '@mdi/js';
import CreateUnitGroup from './component/CreateUnitGroup.vue';

const handleGroupCreated = () => {
  showGroupDialog.value = false;
};

const showGroupDialog = ref(false);
</script>
