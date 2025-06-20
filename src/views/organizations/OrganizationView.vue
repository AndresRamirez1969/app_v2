<script setup>
defineProps({
    organizations: Array
});
</script>

<template>
  <BaseBreadcrumb></BaseBreadcrumb>
  <v-row>
    <v-col cols="12" md="12">
        <v-card v-for="org in organizations" :key="org.id" class="mb-3">
           <v-card-title>{{ org.legal_name }} </v-card-title>
           <v-card-subtitle>{{ org.alias }}</v-card-subtitle>
           <v-card-text>{{ org.folio }}</v-card-text>

           <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="info" size="small" variant="outlined">
                Ver
              </v-btn>
              <v-btn color="primary" size="small" variant="flat">
                Editar
              </v-btn>
           </v-card-actions>
        </v-card>
    </v-col>
  </v-row>
</template>