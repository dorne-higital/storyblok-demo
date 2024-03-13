<template>
    <div
      v-editable="blok"
      class="w-full p-12 bg-[#f7f6fd] rounded-[5px] text-center"
    >
      <h2 class="text-[#1d243d] font-bold">
        {{ blok.heading }}
      </h2>

      <h5 class="text-[#1d243d] font-bold">
        {{ blok.subheading }}
      </h5>
  
      <p>
        {{ blok.description }}
      </p>
    </div>
  </template>
  
  <script setup>
  defineProps({ blok: Object });
  </script>
  