<template>
  <div class="logo">
    <v-img :src="logoUrl" alt="Company Logo" max-height="30" contain class="mx-auto" />
  </div>
</template>
<script setup lang="ts">
const logoUrl = 'https://tasker-v2-bucket.s3.us-east-2.amazonaws.com/public/Logotipo+1.svg';
</script>
