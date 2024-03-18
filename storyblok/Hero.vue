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
        :src="blok.Image.filename"
        :alt="blok.Image.alt"
        class=""
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
        h4 {
            font-size: 1.5rem;
        }
    </style>
  