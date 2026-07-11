# System impact map

| Concern | Current owners | Target owner |
|---|---|---|
| Route identity | body-class exclusions, route registries | React route descriptor + shell data attribute |
| Theme | inline head boot, SiteApp, legacy runtimes | inline no-flash seed + shared React/theme module |
| Wall/config | SiteApp and route runtimes | shared shell runtime |
| Noise | SiteApp, Home, Portfolio, CV, route class | shared shell runtime + `<html>` readiness |
| Footer/social/time | React plus legacy enhancement calls | React footer + one shared clock lifecycle |
| Production HTML heads | repeated files | generated canonical entry head |
| Daily Focus shell | bridge-owned shell boot | StudioShell; bridge owns renderer only |
| Legacy DOM fallback | runtime element creation | React DOM assertions |
| Verification | route-specific audits | release matrix with cross-route parity assertions |

