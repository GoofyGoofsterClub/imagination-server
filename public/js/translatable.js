var CurrentLanguage = "en";
var availableLanguages = [];
var globalTranslationObject = {};
var defaultLanguage = {};

class Translatable
{
    static async getTranslationObject(language)
    {
        let languageObject = await fetch(`/public/translations/${language}.json`);
        return await languageObject.json();
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
        if (!availableLanguages.find(x => x.code == language)) return false;
        CurrentLanguage = language;
        return true;
    }

    static find(query)
    {
        let el = document.querySelector(query);
        let translatables = el.querySelectorAll("[translatable-id]");
        

        return Array.from(translatables).map(x => { return new TranslatableElement(x, x.getAttribute("translatable-id")); });
    }

    static getTranslationKey(key)
    {
        if (!globalTranslationObject[key])
            return defaultLanguage[key] ? defaultLanguage[key] : key;
        return globalTranslationObject[key];
    }

    static translate(translatableElement)
    {
        translatableElement.element.innerHTML = this.getTranslationKey(translatableElement.translatableId);
    }

    static translateGroup(translationElements)
    {
        for (var i = 0; i < translationElements.length; i++)
        {
            this.translate(translationElements[i]);
        }
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