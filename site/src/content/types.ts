/** A page of the manual. `slug` is the file in `docs/` and the route. */
export interface PageEntry {
  slug: string;
  title: string;
}

export interface DocSection {
  id: string;
  title: string;
  html: string;
}

export interface DocModule {
  /** The page's own `#` heading. */
  title: string;
  /** The text between the title and the first `##`. */
  intro: string;
  sections: DocSection[];
}
