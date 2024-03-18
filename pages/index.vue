<script setup>
const story = await useAsyncStoryblok('/', { version: 'draft' },
{ customParent: 'https://app.storyblok.com' })
</script>

<template>
  <StoryblokComponent v-if="story" :blok="story.content" />
  <p>hello</p>
</template>
