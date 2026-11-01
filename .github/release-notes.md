@totallynotdavid/solid-motion 0.1.2 is out.

This is a small fix release. It follows 0.1.1 by twelve days.

The `motion.*` proxy now type-checks against `@solidjs/web` 2.0.0-rc.19. That
release gave element props a `data-*` index signature, and the proxy's internal
component cache no longer accepted the type it was declared with. The cache is
now typed by `MotionProps`. Nothing changes at runtime, and the public types
keep their names and shapes.

The package also depends on `motion-dom` `^14.7.1` instead of `^14.3.0`. A fresh
install picks the newer 14.x release.

The rest is the repository: dependency and tool bumps, a dry run and a notes
check in the release workflow, a site deployment to GitHub Pages, and docs. None
of it ships in the package.

## Known problems

None known.

## What to do

Upgrade with `npm install @totallynotdavid/solid-motion@0.1.2`. Solid 2 is still
a prerelease. Install `solid-js` and `@solidjs/web` from the `next` tag, as the
readme says. Report problems at
https://github.com/totallynotdavid/solid-motion/issues.
