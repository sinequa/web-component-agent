import { TranslocoGlobalConfig } from '@jsverse/transloco-utils';

const config: TranslocoGlobalConfig = {
  rootTranslationsPath: 'src/assets/i18n/',
  langs: ['en', 'fr', 'de', 'ja'],
  keysManager: {},
  scopedLibs: [
    {
      src: '@sinequa/agent',
      dist: ['src/assets/i18n']
    },
    {
      src: '@sinequa/atomic-angular',
      dist: ['src/assets/i18n']
    }
  ],
  defaultLang: 'en'
};

export default config;
