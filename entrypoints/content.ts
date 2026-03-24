import { defineContentScript } from '#imports';
import {FloatingFab} from "@/modules/utils/fab";

export default defineContentScript({
  matches: ['<all_urls>'],
  excludeMatches: [
    // '*://*.google.com/maps/*',  // пример исключения
  ],
  // runAt: 'document_start',
  matchAboutBlank: true,
  world: 'ISOLATED',
  
  async main() {
    FloatingFab.run();
  },
});