
Use the context7 mcp tool to look up documentation. 
If you are unsure how to do something, use `gh_grep` to search code examples from github.
in your gh_grep querys include the keyword vue 


## Git 

- **Commit Often:** Keep commits small, focused, and shareable to simplify integration and prevent merge conflicts. Only commit complete, logical components. Use Git‘s «Stash» feature for temporary changes to maintain a clean working directory.
- **Commit Related Changes:** Each commit should encapsulate a single, related change (e.g., one bug fix per commit). This enhances clarity for reviewers and simplifies rollbacks. Use Git's staging area for granular commits.
- **Use Branches:** Leverage Git‘s branching capabilities extensively for features, bug fixes, and experiments to isolate different development lines.

- **Commit Specification (Conventional Commits):**
  The keywords “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” are interpreted as described in RFC 2119.
  *   **Format:** `<type>[scope][!]: <description>`
  *   **Type (MUST):** A noun (e.g., `feat`, `fix`). `feat` for new features, `fix` for bug fixes. Other types (e.g., `docs`, `chore`) MAY be used.
  *   **Scope (OPTIONAL):** A noun in parenthesis describing a codebase section (e.g., `fix(parser):`).
  *   **Breaking Change Indicator (OPTIONAL):** `!` immediately before `:` signals a breaking change.
  *   **Description (MUST):** A short summary of changes, immediately following the colon and space.
  *   **Body (OPTIONAL):** Longer, free-form contextual information, one blank line after the description.
  *   **Footers (OPTIONAL):** One or more lines, one blank line after the body.
      *   **Format:** `token: <value>` or `token #<value>`.
      *   **Token:** Uses `-` in place of whitespace (e.g., `Acked-by`). `BREAKING CHANGE` or `BREAKING-CHANGE` is an exception and MAY also be used as a token.
  *   **Breaking Changes (MUST):** Indicated by `!` in the prefix or a `BREAKING CHANGE:` footer. If `!` is used, the commit description SHALL detail the breaking change, and the footer is OPTIONAL.
  *   **Case Sensitivity:** Units are not case-sensitive, except `BREAKING CHANGE` which MUST be uppercase. `BREAKING-CHANGE` is synonymous with `BREAKING CHANGE` in footers.


when the user asks for a change thats a good time to commit the previous ones 
## misc
- use podman instead of docker
- run `bun run knip` before commits to catch unused code and dependencies
- keep Knip config broad in this repo (`src/**/*`, `server/**/*`, `test/**/*`, `tests/**/*`); explicit entry globs were noisy and missed CSS-side usage
- Playwright's webServer check should match the actual bound loopback host here (`localhost`/`::1` vs `127.0.0.1`)
- for UI changes, capture Playwright screenshots of the affected states/features and review them before considering the work complete

- Keep code simple and maintainable
