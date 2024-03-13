<script setup>
const story = await useAsyncStoryblok('/landing', { version: 'draft' },
{ customParent: 'https://app.storyblok.com' })
</script>

<template>
  <StoryblokComponent v-if="story" :blok="story.content" />
</template>
