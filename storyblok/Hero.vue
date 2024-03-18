<template>
    <div
      v-editable="blok"
    >
      <h1>
        {{ blok.heading }}
      </h1>

      <h4>
        {{ blok.subheading }}
      </h4>
  
      <p>
        {{ blok.description }}
      </p>

      <img
        :src="blok.image.filename"
        :alt="blok.image.alt"
        class="w-full h-48 xl:h-72 object-cover"
      />
    </div>
  </template>
  
  <script setup>
  defineProps({ blok: Object });
  </script>

    <style>
        h1 {
            font-size: 3rem;
        }
    </style>
  