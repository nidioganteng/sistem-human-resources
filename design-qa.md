# Employee directory design QA

final result: blocked

## Comparison target and state

- Source visual truth: `docs/design/employee-directory-reference.jpg`, downloaded from the user's Pinterest image URL and opened with the image viewer. Source dimensions: 1200 × 900 pixels. Raster density unknown.
- Implementation: existing authenticated `/karyawan` route, using live employee API data; all employment types selected by default.
- Implementation screenshot path: unavailable. The in-app browser returned `The browser access host is unavailable`.
- CSS viewport and deviceScaleFactor: unavailable; no browser-rendered capture obtained. No density normalization or combined comparison could be performed.
- Intended adaptation: retain the existing GSG navigation, branding and Inter font; translate the reference order cards into employee cards. Use its compact grid, teal filter selection, white cards, status badges and top search. Restaurant content and branding are intentionally replaced with employee content. The user subsequently requested existing blue gradient primary buttons instead of yellow actions; that is the current implementation.

## Findings

- Blocking verification gap: source is available, but browser-rendered implementation evidence is missing. Visual fidelity, responsive behavior and browser interactions cannot be approved from code or a successful build.
- No visual mismatch severities assigned: no combined source/implementation comparison was possible.

## Required fidelity surfaces

| Surface | Evidence and verification status |
| --- | --- |
| Fonts and typography | Source opened; existing Inter retained intentionally. Rendered size, weight, wrapping and truncation remain unverified. |
| Spacing and layout rhythm | Source grid inspected; implementation defines adaptive one/two/three-column layout, 18px gutters, 20px card padding and 16px corners. Rendered proportions and overflow remain unverified. |
| Colors and tokens | Teal filters adapted from source; blue gradient primary actions use the existing button component per subsequent user request. Existing theme tokens retained elsewhere. Rendered contrast in both themes remains unverified. |
| Image quality | Employee photos use existing authenticated document endpoint for HR/CEO only. Missing/unavailable photos and manager access show a standard library person icon. Photo rendering and crop remain unverified. No employee likenesses invented. |
| Copy and content | Indonesian employee labels and real API fields replace restaurant content. Existing database IDs are not presented as permanent GS employee identifiers. Rendered text flow remains unverified. |

## Comparison evidence and history

- Source opened at native image dimensions.
- Implementation capture: blocked before first visual comparison by browser host unavailability.
- Full-view comparison: not performed.
- Focused region comparison: not performed; needed for card headers, status badges, filters and photo crop when browser access is restored.
- No visual QA pass or post-fix visual iteration is claimed.

## Checks completed

- `npm run build`: passed.
- `php tests/backend.php --mysql`: 70 checks passed in an isolated test database, including employee-specific discipline history and role restrictions. Subsequent presentation-only changes also passed the standard 15 backend checks.
- `node --test tests/employee-directory.test.mjs`: passed on Node 24.20.0; exercises combined filters, case-insensitive trimmed search, null division, all types, no mutation, and excludes unrelated identity fields from search.
- `git diff --check`: passed.
- Primary browser interactions (search, filters, profile navigation, photo display, add employee modal): not tested.
- Browser console errors: not inspected.

## Implementation checklist

1. Restore in-app browser access and open authenticated `/karyawan` with permitted test data.
2. Capture desktop and mobile states, including light/dark, loading, empty results and add dialog.
3. Normalize reference and implementation content regions and place both in a single comparison image.
4. Compare full view and focused card/filter crops, then fix actionable P0/P1/P2 differences and recapture.
5. Test search/filter combinations, profile navigation, photo permissions, retry and employee creation; inspect console errors.
6. Change final result only after visual comparison and browser interactions pass.

## Subsequent UI fixes

Employee edit and validation dialogs now use the shared body portal modal, whose header stays outside the scroll area. Native selects share consistent sizing and inset library chevrons. Discipline details are visible only inside the employee profile; the user requested removing the directory card warning badge. These changes passed build checks but have not been captured in the browser. Visual QA remains blocked.
