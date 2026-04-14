## component learnings
- Keep the shared dialog primitive neutral about width; if a modal needs a special size, let the consumer set it instead of fighting `DialogContent` with `!important`.
- For tall modals like Global Settings, make the shell `flex flex-col` and move scrolling to the body with `min-h-0 flex-1 overflow-y-auto` so the header and footer stay stable.
