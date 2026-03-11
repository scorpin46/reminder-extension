import { defineContentScript } from '#imports';
import {FloatingFab} from "@/components/fab";

export default defineContentScript({
  matches: ['<all_urls>'],
  excludeMatches: [
    // '*://*.google.com/maps/*',  // пример исключения
  ],
  runAt: 'document_start',

  async main() {
    FloatingFab.run();
  },
});