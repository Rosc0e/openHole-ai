<script setup lang="ts">
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useGraphStore } from '~/stores/graph'
import ChatPair from './ChatPair.vue'

const store = useGraphStore()

const nodeTypes = {
  chatPair: ChatPair
}
</script>

<template>
  <div class="h-screen w-screen">
    <VueFlow
      v-model:nodes="store.nodes"
      v-model:edges="store.edges"
      :node-types="nodeTypes"
      :snap-to-grid="true"
      :snap-grid="[20, 20]"
      class="rabbit-flow"
    >
      <Background />
      <Controls />
    </VueFlow>
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';
</style>
