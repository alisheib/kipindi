"use client";

/**
 * vb7 · THE CONTACT BOOK'S SEARCH BOX — the kit SearchBox, with the book's own reading of a number in its echo row.
 *
 * ⭐ WHY A FILE OF ITS OWN. The echo row under the box speaks the GRAMMAR by default, and read "0712 345 678" as
 * "3 words" — false here: the book matches a whole number exactly and never searches a part of one (D19).
 * `contactSearchEcho` says what the search will really do — "Whole number — matched exactly", or the parser's own reason
 * for a number attempt it refuses. It is a FUNCTION, and a function cannot cross from the server page (`page.tsx`) into a
 * client component, so it is handed to the box here, on the client side of that boundary.
 * ⭐ `helpFields` names the one field this grammar knows (`name:`, from `CONTACT_SEARCH`), as every other admin SearchBox
 * does. The box stays in url mode: it owns `?q`, and the page reads it.
 *
 * Guard: `test:contacts-page` 19 (this file's props, the echo EXECUTED) · `test:search-adoption`.
 */
import { SearchBox } from "@/components/ui/search-box";
import { CONTACT_SEARCH, fieldNames } from "@/lib/search";
import { contactSearchEcho } from "@/lib/contacts/contact-number";
import { CONTACTS_SEARCH_LABEL, CONTACTS_SEARCH_PLACEHOLDER } from "./contacts-copy";

/** The field names the box's help offers as chips — the grammar's own. */
const HELP_FIELDS = fieldNames(CONTACT_SEARCH);

export function ContactsSearchBox() {
  return (
    <SearchBox
      mode="url"
      placeholder={CONTACTS_SEARCH_PLACEHOLDER}
      ariaLabel={CONTACTS_SEARCH_LABEL}
      helpFields={HELP_FIELDS}
      describe={contactSearchEcho}
    />
  );
}
