let CurrentLanguage = "en";
let availableLanguages = [];
let globalTranslationObject = {};
const defaultLanguage = window.__APP?.translations || {};

class Translatable
{
    static translations = new Map();
    static async getTranslationObject(language)
    {
        if (language === 'en' && window.__APP?.translations) return window.__APP.translations;
        if (!this.translations.has(language)) {
            this.translations.set(language, FetchJSON(`/public/translations/${language}.json`).catch(error => {
                this.translations.delete(language);
                throw error;
            }));
        }
        return this.translations.get(language);
    }

    static async getLanguages()
    {
        let _availableLanguages = await fetch("/public/languages.json");
        return await _availableLanguages.json();
    }

    static setAvailableLanguages(languages)
    {
        availableLanguages = languages;
    }

    static setGlobalTranslationObject(translationObject)
    {
        globalTranslationObject = translationObject;
    }

    static setLanguage(language)
    {
        if (!availableLanguages.find(x => x.code === language)) return false;
        CurrentLanguage = language;
        return true;
    }

    static find(query)
    {
        let el = document.querySelector(query);
        if (!el) return [];
        let translatables = el.querySelectorAll("[translatable-id]");
        

        return Array.from(translatables).map(x => { return new TranslatableElement(x, x.getAttribute("translatable-id")); });
    }

    static getTranslationKey(key)
    {
        if (globalTranslationObject[key] !== undefined && globalTranslationObject[key] !== null)
            return globalTranslationObject[key];
        return defaultLanguage[key] !== undefined && defaultLanguage[key] !== null ? defaultLanguage[key] : key;
    }

    static translate(translatableElement)
    {
        const translation = this.getTranslationKey(translatableElement.translatableId);
        translatableElement.element.textContent = translation;
        // Keep <input> placeholders translated alongside their visible text.
        if (translatableElement.element instanceof HTMLInputElement)
            translatableElement.element.placeholder = translation;
    }

    static translateGroup(translationElements)
    {
        translationElements.forEach(translatableElement => {
            this.translate(translatableElement);
        });
    }
}


class TranslatableElement
{
    constructor(element, translatableId)
    {
        this.element = element;
        this.translatableId = translatableId;
    }
}
