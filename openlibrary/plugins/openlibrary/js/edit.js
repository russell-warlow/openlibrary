import { isbnOverride } from './isbnOverride';
/* global render_language_field, render_work_autocomplete_item, render_language_autocomplete_item, render_work_field */
/* Globals are provided by the edit edition template */

/* global render_author, render_author_autocomplete_item */
/* Globals are provided by the author-autocomplete template */

function error(errordiv, input, message) {
    $(errordiv).show().html(message);
    $(input).trigger('focus');
    return false;
}

function update_len() {
    var len = $('#excerpts-excerpt').val().length;
    var color;
    if (len > 2000) {
        color = '#e44028';
    } else {
        color = 'gray';
    }
    $('#excerpts-excerpt-len').html(2000 - len).css('color', color);
}

/**
 * Gets length of 'textid' section and limit textid value length to input 'limit'
 *
 * @param {String} textid  text section id name
 * @param {Number} limit   character number limit
 * @return {boolean} is character number below or equal to limit
 */
function limitChars(textid, limit) {
    var text = $(`#${textid}`).val();
    var textlength = text.length;
    if (textlength > limit) {
        $(`#${textid}`).val(text.substr(0, limit));
        return false;
    } else {
        return true;
    }
}

/**
 * This is needed because jQuery has no forEach equivalent that works with jQuery elements instead of DOM elements
 * @param selector - css selector used by jQuery
 * @returns {*[]} - array of jQuery elements
 */
function getJqueryElements(selector){
    const queryResult = $(selector);
    const jQueryElementArray = [];
    for (let i = 0; i < queryResult.length; i++){
        jQueryElementArray.push(queryResult.eq(i))
    }
    return jQueryElementArray;
}

export function initRoleValidation() {
    const dataConfig = JSON.parse(document.querySelector('#roles').dataset.config);
    $('#roles').repeat({
        vars: {prefix: 'edition--'},
        validate: function (data) {
            if (data.role === '' || data.role === '---') {
                return error('#role-errors', '#select-role', dataConfig['Please select a role.']);
            }
            if (data.name === '') {
                return error('#role-errors', '#role-name', dataConfig['You need to give this ROLE a name.'].replace(/ROLE/, data.role));
            }
            $('#role-errors').hide();
            return true;
        }
    });
}

/**
 * Takes an isbn string and returns true if the given ISBN is already added
 * to this edition.
 * @param {String} isbn  ISBN string duplication checking
 * @return {boolean}  true if the given ISBN is already added to the edition
 */
function isIsbnDupe(isbn) {
    const isbnEntries = document.querySelectorAll('.isbn_10, .isbn_13');
    return Array.from(isbnEntries).some(entry => entry['value'] === isbn);
}

/**
 * Takes an ISBN 10 string and verifies that is the correct length and has the
 * correct characters for an ISBN. It does not verify the checksum.
 * @param {String} isbn  ISBN string to check
 * returns {boolean}  true if the isbn has a valid format
 */
function isFormatValidIsbn10(isbn) {
    const regex = /^[0-9]{9}[0-9X]$/;
    return regex.test(isbn);
}

/**
 * Verify the checksum for ISBN 10.
 * Adapted from https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch04s13.html
 * @param {String} isbn  ISBN string for validating
 * @returns {boolean}  true if ISBN string is a valid ISBN 10
 */
export function isChecksumValidIsbn10(isbn) {
    const chars = isbn.split('');
    let last = chars.pop();
    let check;

    // With ISBN 10, the last character can be [0-9] or string 'X'.
    if (last !== 'X') {
        last = parseInt(last);
    }

    // Compute the ISBN-10 check digit
    chars.reverse();
    const sum = chars
        .map((char, idx) => ((idx + 2) * parseInt(char, 10)))
        .reduce((acc, sum) => acc + sum, 0)

    check = 11 - (sum % 11);
    if (check === 10) {
        check = 'X';
    } else if (check === 11) {
        check = 0;
    }

    // The ISBN 10 is valid if the check digit and last digit match.
    return check === last;
}

/**
 * Takes an isbn string and verifies that is the correct length and has the
 * correct characters for an ISBN. It does not verify the checksum.
 * @param {String} isbn  ISBN string to check
 * returns {boolean}  true if the isbn has a valid format
 */
function isFormatValidIsbn13(isbn) {
    const regex = /^[0-9]{13}$/
    return regex.test(isbn)
}

/**
 * Verify the checksum for ISBN 13.
 * Adapted from https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch04s13.html
 * @param {String} isbn  ISBN string for validating
 * @returns {Boolean}  true if ISBN string is a valid ISBN 13
 */
export function isChecksumValidIsbn13(isbn) {
    const chars = isbn.split('');
    // Remove the final ISBN digit from `chars`, and assign it to `last` for comparison.
    const last = parseInt(chars.pop());
    let check;

    const sum = chars
        .map((char, idx) => ((idx % 2 * 2 + 1) * parseInt(char, 10)))
        .reduce((sum, num) => sum + num, 0);

    check = 10 - (sum % 10);
    if (check === 10) {
        check = 0;
    }

    // The ISBN 13 is valid if the check digit and last digit match.
    return check === last;
}

/**
 * Removes spaces and hyphens from an ISBN string and returns it.
 * @param {String} isbn  ISBN string for parsing
 * @returns {String}  parsed isbn string
 */
function parseIsbn(isbn) {
    return isbn.replace(/[ -]/g, '');
}

/**
 * Displays a confirmation box in the error div to confirm the addition of an
 * ISBN with a valid form but which fails the checksum.
 * @param {Object} data  data from the input form, gathered via js/jquery.repeat.js
 * @param {String} isbnConfirmString  a const with the HTML to create the confirmation message/buttons
 */
export function isbnConfirmAdd(data, isbnConfirmString) {
    // Display the error and option to add the ISBN anyway.
    $('#id-errors').show().html(isbnConfirmString);

    const yesButtonSelector = '#yes-add-isbn'
    const noButtonSelector = '#do-not-add-isbn'
    const onYes = () => {$('#id-errors').hide()};
    const onNo = () => {
        $('#id-errors').hide();
        isbnOverride.clear();
    }
    $(document).on('click', yesButtonSelector, onYes);
    $(document).on('click', noButtonSelector, onNo);

    // Save the data to isbnOverride so it can be picked up via onAdd in
    // js/jquery.repeat.js when the user confirms adding the invalid ISBN.
    isbnOverride.set(data)
    return false;
}

/**
 * Called by initIdentifierValidation(), along with tests in
 * tests/unit/js/editEditionsPage.test.js, to validate the addition of new
 * ISBNs to an edition.
 * @params {Object} data  data from the input form
 * @returns {boolean}  true if ISBN passes validation
 */
export function validateIdentifiers(data) {
    const dataConfig = JSON.parse(document.querySelector('#identifiers').dataset.config);
    const isbnConfirmString = `ISBN ${data.value} may be invalid. Add it anyway? <button class="repeat-add" id="yes-add-isbn" type="button">Yes</button>&nbsp;<button id="do-not-add-isbn" type="button">No</button>`;

    if (data.name === '' || data.name === '---') {
        return error('#id-errors', 'select-id', dataConfig['Please select an identifier.'])
    }
    const label = $('#select-id').find(`option[value='${data.name}']`).html();
    if (data.value === '') {
        return error('#id-errors', 'id-value', dataConfig['You need to give a value to ID.'].replace(/ID/, label));
    }
    if (['ocaid'].includes(data.name) && /\s/g.test(data.value)) {
        return error('#id-errors', 'id-value', dataConfig['ID ids cannot contain whitespace.'].replace(/ID/, label));
    }
    // Remove spaces and hyphens before checking ISBN 10.
    if (data.name === 'isbn_10') {
        data.value = parseIsbn(data.value);
    }
    if (data.name === 'isbn_10' && isFormatValidIsbn10(data.value) === false) {
        return error('#id-errors', 'id-value', dataConfig['ID must be exactly 10 characters [0-9] or X.'].replace(/ID/, label));
    }
    if (data.name === 'isbn_10' && isIsbnDupe(data.value) === true) {
        return error('#id-errors', 'id-value', dataConfig['That ISBN already exists for this edition.'].replace(/ISBN/, label));
    }
    // Remove spaces and hyphens before checking ISBN 13.
    if (data. name === 'isbn_13') {
        data.value = parseIsbn(data.value);
    }
    if (data.name === 'isbn_13' && isFormatValidIsbn13(data.value) === false) {
        return error('#id-errors', 'id-value', dataConfig['ID must be exactly 13 digits [0-9]. For example: 978-1-56619-909-4'].replace(/ID/, label));
    }
    if (data.name === 'isbn_13' && isIsbnDupe(data.value) === true) {
        return error('#id-errors', 'id-value', dataConfig['That ISBN already exists for this edition.'].replace(/ISBN/, label));
    }
    // Here the ISBN has a valid format, but also has an invalid checksum. Give the user a chance to verify
    // the ISBN, as books sometimes issue with invalid ISBNs and we want to be able to add them.
    // See https://en-academic.com/dic.nsf/enwiki/8948#cite_ref-18 for more.
    if (data.name === 'isbn_10' && isFormatValidIsbn10(data.value) === true && isChecksumValidIsbn10(data.value) === false) {
        isbnConfirmAdd(data, isbnConfirmString)
        return false
    }
    if (data.name === 'isbn_13' && isFormatValidIsbn13(data.value) === true && isChecksumValidIsbn13(data.value) === false) {
        isbnConfirmAdd(data, isbnConfirmString)
        return false
    }
    $('#id-errors').hide();
    return true;
}

export function initIdentifierValidation() {
    $('#identifiers').repeat({
        vars: {prefix: 'edition--'},
        validate: function(data) {return validateIdentifiers(data)},
    });
}

export function initClassificationValidation() {
    const dataConfig = JSON.parse(document.querySelector('#classifications').dataset.config);
    $('#classifications').repeat({
        vars: {prefix: 'edition--'},
        validate: function (data) {
            if (data.name === '' || data.name === '---') {
                return error('#classification-errors', '#select-classification', dataConfig['Please select a classification.']);
            }
            if (data.value === '') {
                const label = $('#select-classification').find(`option[value='${data.name}']`).html();
                return error('#classification-errors', '#classification-value', dataConfig['You need to give a value to CLASS.'].replace(/CLASS/, label));
            }
            $('#classification-errors').hide();
            return true;
        }
    });
}

export function initLanguageMultiInputAutocomplete() {
    $(function() {
        getJqueryElements('.multi-input-autocomplete--language').forEach(jqueryElement => {
            jqueryElement.setup_multi_input_autocomplete(
                'input.language-autocomplete',
                render_language_field,
                {endpoint: '/languages/_autocomplete'},
                {
                    max: 6,
                    formatItem: render_language_autocomplete_item
                }
            );
        })
    });
}

export function initWorksMultiInputAutocomplete() {
    $(function() {
        getJqueryElements('.multi-input-autocomplete--works').forEach(jqueryElement => {
            /* Values in the html passed from Python code */
            const dataConfig = JSON.parse(jqueryElement[0].dataset.config);
            jqueryElement.setup_multi_input_autocomplete(
                'input.work-autocomplete',
                render_work_field,
                {
                    endpoint: '/works/_autocomplete',
                    addnew: dataConfig['isPrivilegedUser'] === 'true',
                    new_name: dataConfig['-- Move to a new work'],
                },
                {
                    minChars: 2,
                    max: 11,
                    matchSubset: false,
                    autoFill: false,
                    formatItem: render_work_autocomplete_item
                });
        });
    });
}

export function initAuthorMultiInputAutocomplete() {
    getJqueryElements('.multi-input-autocomplete--author').forEach(jqueryElement => {
        /* Values in the html passed from Python code */
        const dataConfig = JSON.parse(jqueryElement[0].dataset.config);
        jqueryElement.setup_multi_input_autocomplete(
            'input.author-autocomplete',
            render_author.bind(null, dataConfig.name_path, dataConfig.dict_path, false),
            {
                endpoint: '/authors/_autocomplete',
                // Don't render "Create new author" if searching by key
                addnew: query => !/OL\d+A/i.test(query),
            },
            {
                minChars: 2,
                max: 11,
                matchSubset: false,
                autoFill: false,
                formatItem: render_author_autocomplete_item
            });
    });
}

export function initEditRow(){
    document.querySelector('#add_row_button').addEventListener('click', ()=>add_row('website'));
}

/**
 * Adds another input box below the last when adding multiple websites to user profile.
 * @param string name - when prefixed with clone_ should match an element identifier in the page. e.g. if name would refer to clone_website
 **/
function add_row(name) {
    const inputBoxes = document.querySelectorAll(`#clone_${name} input`);
    const inputBox = document.createElement('input');
    inputBox.name = `${name}#${inputBoxes.length}`;
    inputBox.type = 'text';
    inputBoxes[inputBoxes.length-1].after(inputBox);
}

function show_hide_title() {
    if ($('#excerpts-display .repeat-item').length > 1) {
        $('#excerpts-so-far').show();
    } else {
        $('#excerpts-so-far').hide();
    }
}

export function initEditExcerpts() {
    $('#excerpts').repeat({
        vars: {
            prefix: 'work--excerpts',
        },
        validate: function(data) {
            if (!data.excerpt) {
                return error('#excerpts-errors', '#excerpts-excerpt', 'Please provide an excerpt.');
            }
            if (data.excerpt.length > 2000) {
                return error('#excerpts-errors', '#excerpts-excerpt', 'That excerpt is too long.')
            }
            $('#excerpts-errors').hide();
            return true;
        }
    });

    // update length on every keystroke
    $('#excerpts-excerpt').on('keyup', function() {
        limitChars('excerpts-excerpt', 2000);
        update_len();
    });

    // update length on add.
    $('#excerpts')
        .on('repeat-add', update_len)
        .on('repeat-add', show_hide_title)
        .on('repeat-remove', show_hide_title);

    // update length on load
    update_len();
    show_hide_title();
}

/**
 * Initializes links element on edit page.
 *
 * Assumes presence of elements with id:
 *    - '#links' and 'data-prefix' attribute
 *    - '#link-label'
 *    - '#link-url'
 *    - '#link-errors'
 */
export function initEditLinks() {
    $('#links').repeat({
        vars: {
            prefix: $('#links').data('prefix')
        },
        validate: function(data) {
            if (data.url.trim() === '' || data.url.trim() === 'https://') {
                $('#link-errors').html('Please provide a URL.');
                $('#link-errors').removeClass('hidden');
                $('#link-url').trigger('focus');
                return false;
            }
            if (data.title.trim() === '') {
                $('#link-errors').html('Please provide a label.');
                $('#link-errors').removeClass('hidden');
                $('#link-label').trigger('focus');
                return false;
            }
            $('#link-errors').addClass('hidden');
            return true;
        }
    });
}

/**
 * Initializes edit page.
 *
 * Assumes presence of elements with id:
 *    - '#link_edition'
 *    - '#tabsAddbook'
 *    - '#contentHead'
 */
export function initEdit() {
    var hash = document.location.hash || '#edition';
    var tab = hash.split('/')[0];
    var link = `#link_${tab.substring(1)}`;
    var fieldname = `:input${hash.replace('/', '-')}`;

    $(link).trigger('click');

    // input field is enabled only after the tab is selected and that takes some time after clicking the link.
    // wait for 1 sec after clicking the link and focus the input field
    if ($(fieldname).length !== 0) {
        setTimeout(function() {
            // scroll such that top of the content is visible
            $(fieldname).trigger('focus');
            $(window).scrollTop($('#contentHead').offset().top);
        }, 1000);
    }
}

const isbn_invalid_checksum = 'Invalid checksum digit';
const isbn10_wrong_length_or_chars = 'ID must be exactly 10 characters [0-9 or X]. For example 0-19-853453-1 or 0198534531';
const isbn13_wrong_length_or_chars = 'ID must be exactly 13 characters [0-9]. For example 978-3-16-148410-0 or 9783161484100';

// a hack to make raiseError perform differently upon subsequent calls
let addBookWithIsbnErrors = false;

function raiseError(event) {
    // if first time calling
    if(!addBookWithIsbnErrors) {
        let confirm = document.getElementById('confirm-add');
        confirm.style.display = 'block';
        confirm.innerHTML = 'ISBN may be invalid. Click \'Add\' again to submit.';
        addBookWithIsbnErrors = true;
        let isbnInput = document.getElementById('id_value');
        isbnInput.focus({focusVisible: true});
        event.preventDefault();
        return false;
    }
    // second time calling
    return true;
}

function validateIsbn(event) {
    let fieldName = document.getElementById('id_name').value;
    let isbn = String(document.getElementById('id_value').value).replace(/[ -]/g, '');
    if (fieldName === 'isbn_10') {
        if(!isFormatValidIsbn10(isbn)) {
            return raiseError(event);
        }
        if(!isChecksumValidIsbn10(isbn)) {
            return raiseError(event);
        }
    }
    else if (fieldName === 'isbn_13') {       
        if(!isFormatValidIsbn13(isbn)) {
            return raiseError(event);
        }
        if(!isChecksumValidIsbn13(isbn)) {
            return raiseError(event);
        }
    }
    return true;
}

function displayError(msg) {
    let errorDiv = document.getElementById('id-errors');
    errorDiv.style.display = 'block';
    errorDiv.innerHTML = msg;
    // let isbnInput = document.getElementById('id_value');
    // isbnInput.focus({focusVisible: true});
}

function clearError() {
    addBookWithIsbnErrors = false;
    let errorDiv = document.getElementById('id-errors');
    errorDiv.style.display = 'none';
    errorDiv.innerHTML = '';
    let confirm = document.getElementById('confirm-add');
    confirm.style.display = 'none';
    confirm.innerHTML = '';
}

function checkIsbn(event) {
    let fieldName = document.getElementById('id_name').value;
    let isbn = String(document.getElementById('id_value').value).replace(/[ -]/g, '');
    if (fieldName === 'isbn_10') {
        if(!isFormatValidIsbn10(isbn)) {
            displayError(isbn10_wrong_length_or_chars);
            return;
        }
        if(!isChecksumValidIsbn10(isbn)) {
            displayError(isbn_invalid_checksum);
            return;
        }
        if(isFormatValidIsbn10(isbn) && isChecksumValidIsbn10(isbn)) {
            clearError();
            return;
        }
    }
    else if (fieldName === 'isbn_13') {       
        if(!isFormatValidIsbn13(isbn)) {
            displayError(isbn13_wrong_length_or_chars);
            return;
        }
        if(!isChecksumValidIsbn13(isbn)) {
            displayError(isbn_invalid_checksum);
            return;
        }
        if(isFormatValidIsbn13(isbn) && isChecksumValidIsbn13(isbn)) {
            clearError();
            return;
        }
    }
    clearError();
}

let addbook = document.getElementById('addbook');
addbook.addEventListener('submit', validateIsbn);
let isbnInput = document.getElementById('id_value');
isbnInput.addEventListener('input', checkIsbn);
let idSelection = document.getElementById('id_name');
idSelection.addEventListener('change', checkIsbn);