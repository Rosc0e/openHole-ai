<script setup lang="ts">
import RabbitFlow from '~/components/graph/RabbitFlow.vue'
import { useRoute } from 'vue-router'
import { useGraphStore } from '~/stores/graph'
import { onMounted } from 'vue'

const route = useRoute()
const store = useGraphStore()

onMounted(async () => {
  const id = route.query.id as string
  if (id) {
    await store.loadGraph(id)
  }
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <RabbitFlow />
  </div>
</template>
