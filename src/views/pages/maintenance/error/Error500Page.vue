<script setup lang="ts"></script>

<template>
  <v-row no-gutters class="overflow-hidden bg-containerBg" style="min-height: 100vh">
    <v-col class="d-flex align-center justify-center">
      <div class="text-center">
        <h1 class="text-h1 mt-2 mb-1">Internal Server Error</h1>
        <p class="text-caption text-lightText">Server error 500. We are fixing the problem. please try <br />again at a later stage.</p>
        <v-btn color="primary" variant="flat" class="mt-4" @click="$router.back()">Regresar</v-btn>
      </div>
    </v-col>
  </v-row>
</template>
<style lang="scss">
.errorMedia {
  > img {
    @media (min-width: 0px) {
      width: 350px;
    }
    @media (min-width: 768px) {
      width: 396px;
    }
  }
}
</style>
