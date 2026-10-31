import React, {createContext, useContext} from 'react';
import {LANGUAGES} from '../../../plugins/api-content/catalogValidation.js';
import {loadAnalyticsCatalog} from '../../lib/contentContext.js';

export const CodeAnalyticsContext = createContext(null);
const CODE_LANGUAGES = new Set(LANGUAGES);

export function validateCodeAnalytics(codeId, language, catalog = loadAnalyticsCatalog()) {
  if (!catalog.hasCodeId(codeId) || !CODE_LANGUAGES.has(language)) return null;
  return Object.freeze({codeId, language});
}

export function useCodeAnalytics() {
  return useContext(CodeAnalyticsContext);
}
