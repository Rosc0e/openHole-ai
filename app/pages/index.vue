<script setup lang="ts">
import RabbitFlow from '~/components/graph/RabbitFlow.vue'
import { useGraphStore } from '~/stores/graph'

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
  <ClientOnly>
    <RabbitFlow />
  </ClientOnly>
</template>
