<template>
  <div class="full-stars" v-if="visible">
    <p class="full-stars__title">
      {{ browser.i18n.getMessage('rateUs') }}
    </p>
    <div class="rating-group">
      <input name="fst" value="5" type="radio" disabled checked/>
      <label for="fst-1">
        <a @click.prevent="clickByStar(1)">
          <IconStar/>
        </a>
      </label>
      <input name="fst" id="fst-1" value="1" type="radio"/>
      <label for="fst-2">
        <a @click.prevent="clickByStar( 2)">
          <IconStar/>
        </a>
      </label>
      <input name="fst" id="fst-2" value="2" type="radio"/>
      <label for="fst-3">
        <a @click.prevent="clickByStar(3)">
          <IconStar/>
        </a>
      </label>
      <input name="fst" id="fst-3" value="3" type="radio"/>
      <label for="fst-4">
        <a @click.prevent="clickByStar(4)">
          <IconStar/>
        </a>
      </label>
      <input name="fst" id="fst-4" value="4" type="radio"/>
      <label for="fst-5">
        <a @click.prevent="clickByStar(5)">
          <IconStar/>
        </a>
      </label>
      <input name="fst" id="fst-5" value="5" type="radio"/>
    </div>
    <button class="full-stars__close" @click="close">
      <IconXmark/>
    </button>
  </div>
</template>

<script setup>
import {getImproveExperienceFormLink, openLink} from "@/modules/utils/helpers.ts";
import IconStar from "@/components/icons/IconStar.vue";
import IconXmark from "@/components/icons/IconXmark.vue";
import {getFeedbackDataStore} from "@/modules/utils/storage.ts";
import {onMounted, ref, watch} from "vue";
import {ReminderService} from "@/modules/reminderService.ts";

const storeReviewLink = 'https://chromewebstore.google.com/detail/set-a-reminder/okbopdkididkejgihepekdmohfomnnhc/reviews';
const feedbackDataStore = getFeedbackDataStore();
const reminderService = ReminderService.instance();
const visible = ref(false);
let feedbackData;

feedbackDataStore.getValue().then(result => feedbackData = result);

const close = () => {
  visible.value = false;
  
  feedbackDataStore.setValue(feedbackData = {
    lastActionDate: Date.now(),
    lastRating: null,
    lastSaveCount: reminderService.repository.state.allCount
  })
}

const clickByStar = async (rating) => {
  const link = rating < 4 ? getImproveExperienceFormLink() : storeReviewLink
  openLink(link);
  
  await feedbackDataStore.setValue(feedbackData = {
    lastActionDate: Date.now(),
    lastRating: rating,
    lastSaveCount: reminderService.repository.state.allCount
  })
  visible.value = false;
}

watch(() => reminderService.repository.state.allCount, async (value, oldValue) => {
  if (value > oldValue && value > 9) {
    feedbackData ??= await feedbackDataStore.getValue();

    const allowCheckingVisible = ! feedbackData.lastActionDate //1. если не было действия (первый показ)
        //2. если было просто закрытие более недели назад
        || ! feedbackData.lastRating && Date.now() - feedbackData.lastActionDate > 7 * 24 * 3600 * 1000
        //3. если была низкая оценка, но юзер активно пользуется дальше и прошло 10дней
        || feedbackData.lastRating && feedbackData.lastRating < 4 && value > feedbackData.lastSaveCount + 10 && Date.now() - feedbackData.lastActionDate > 10 * 24 * 3600 * 1000 

    if (allowCheckingVisible) {
      visible.value = true;
    }
  }
})
</script>