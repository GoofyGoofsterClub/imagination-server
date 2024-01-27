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

    static find(query)
    {
        let el = document.querySelector(query);
        let translatables = el.querySelectorAll("[translatable-id]");
        

        return Array.from(translatables).map(x => { return new TranslatableElement(x, x.getAttribute("translatable-id")); });
    }

    static translate(translatableElement, language)
    {
        translatableElement.element.innerText = globalTranslationObject[language][translatableElement.translatableId] ? globalTranslationObject[language][translatableElement.translatableId] : translatableElement.translatableId;
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