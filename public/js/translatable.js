var CurrentLanguage = "en";
var availableLanguages = [];
var globalTranslationObject = {};

class Translatable
{
    static async getTranslationObject()
    {
        let result = await fetch("/public/translation.json");
        return await result.json();
    }

    static getLanguages(translationObject)
    {
        return Object.keys(translationObject);
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
        if (!availableLanguages.includes(language)) return false;
        CurrentLanguage = language;
        return true;
    }

    static find(query)
    {
        let el = document.querySelector(query);
        let translatables = el.querySelectorAll("[translatable-id]");
        

        return Array.from(translatables).map(x => { return new TranslatableElement(x, x.getAttribute("translatable-id")); });
    }

    static getTranslationKey(language, key)
    {
        return globalTranslationObject[language][key];
    }

    static translate(translatableElement, language)
    {

        translatableElement.element.innerHTML = globalTranslationObject[language][translatableElement.translatableId] ? globalTranslationObject[language][translatableElement.translatableId] : translatableElement.translatableId;
    }

    static translateGroup(translationElements, language)
    {
        for (var i = 0; i < translationElements.length; i++)
        {
            this.translate(translationElements[i], language);
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