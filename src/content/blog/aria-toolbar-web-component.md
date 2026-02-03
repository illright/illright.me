---
title: 'Why is there still no Web Component for the ARIA toolbar?'
description: 'Me building a toolbar Web Component and discovering Lit controllers in the process.'
pubDate: 'Feb 01 2026'
---

## The reason I care

I'm building an application without using a JavaScript framework. Why? For fun, as well as a few more practical reasons. One thing I need for that application is a _toolbar_ — a UI component that contains a bunch of buttons that you can easily switch through using arrows on your keyboard ([full description of the ARIA toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)).

The folks in the Open UI group are working hard to bring this and many other great UI components to the web platform natively. If you didn't know, they have been leading such long-awaited proposals such as a customizable `<select>` element or the Popover API. They have [a proposal that would make implementing the toolbar easy](https://open-ui.org/components/scoped-focusgroup.explainer/), but for the time being, it's not been accepted yet, let alone implemented anywhere. So we gotta build our own!

I already chose not to rely on a framework, so wonderful solutions such as *React Aria*, *Radix UI*, *Melt UI* are unavailable to me. I like maintaining code as much as the next person, so the idea of hand-coding, or even LLM-coding, these keyboard interactions does not excite me. A quick search netted me exactly 0 solutions packaged as Web Components. Sigh.

Hey, wait a second, React Aria is developed by the people at Adobe, as part of their Spectrum design system, and they have a Web Components version. Let's go through their docs really quickly. They have something called *Action Group*, which seems to be exactly what I need, but it's also packaged with a bunch of styles and it's built for their button components, which is not what I need.

## Enter controllers

A glance at the source code for this Action Group component reveals an interesting line:

```js
import { RovingTabindexController } from '@spectrum-web-components/reactive-controllers/src/RovingTabindex.js';
```

Roving tab index controller! What's a controller?

<aside>

**Never mind that, what's roving tab index?** It's the name of a JavaScript trick to manage focus using means other than the Tab key. Say you have thirty buttons in a row and you want the keyboard users to quickly skip through all these buttons if they don't need them. 

Give the first button `tabindex="0"` (default value) and the rest of the buttons `tabindex="-1"` (means that the element will not be reachable by pressing Tab, but can be focused using JavaScript). Then add an event listener for the "right arrow" key that will change the second button to have `tabindex="0"` and the first one to have `tabindex="-1"`, as well as focusing the second button.

</aside>

Here's what the Spectrum docs say about it:

> The `RovingTabindexController` is a [reactive controller](https://lit.dev/docs/composition/controllers/) that implements the [roving tabindex pattern](https://www.w3.org/TR/wai-aria-practices-1.2/#kbd_roving_tabindex).
>
> <cite>https://opensource.adobe.com/spectrum-web-components/tools/roving-tab-index/</cite>

And a reactive controller is…

> A reactive controller is an object that can hook into a component's [reactive update cycle](https://lit.dev/docs/components/lifecycle/#reactive-update-cycle). Controllers can bundle state and behavior related to a feature, making it reusable across multiple component definitions.
>
> <cite>https://lit.dev/docs/composition/controllers/</cite>

Okay, so a controller is a concept from Lit, a way to pack up and reuse logic across Web Components, kind of like custom hooks in React. This is amazing! The only drawback is that using these controllers requires a base class that is aware of how they work. In Lit, their base `LitElement` is controller-capable by default, but there's also a slimmer version, `ReactiveElement`, that doesn't contain as much Lit-related logic. Since I'm planning to build a Web Component that doesn't use the Shadow DOM at all (people have been referring to them as [HTML web components](https://adactio.com/journal/20618)), I don't need most of Lit.

To use it in a Web Component, we just need to construct a `RovingTabindexController` object and pass `this` as the first argument:

```js {5-7}
import { RovingTabindexController } from "@spectrum-web-components/reactive-controllers";
import { ReactiveElement } from "lit";

class ToolBar extends ReactiveElement {
	rovingTabindexController = new RovingTabindexController(this, { 
		/* options */ 
	})
}
```

Refreshingly easy! 

The most important option that we need to pass in is `elements` — a callback that will return all elements whose focus should be managed. I envision that this component is to be used like this:

```html
<tool-bar>
	<button>Tool 1</button>
	<button>Tool 2</button>
	<div role="separator" aria-orientation="vertical"></div>
	<button>Tool 3</button>
</tool-bar>
```

So basically, the `elements` callback should just get all buttons inside itself. Here's how we can do that:

```js {6}
import { RovingTabindexController } from "@spectrum-web-components/reactive-controllers";
import { ReactiveElement } from "lit";

class ToolBar extends ReactiveElement {
	rovingTabindexController = new RovingTabindexController(this, { 
		elements: () => [...this.querySelectorAll('button')]
	})
}
```

And that's it! Well, not entirely, because by default, `ReactiveElement` creates a shadow root for you, and we want to avoid that, so we also need to override the `createRenderRoot` method to simply return `this`.

And here is the final result, running in a quick Vite setup:

<embed src="https://stackblitz.com/edit/stackblitz-starters-p6zz2t5r?embed=1&file=index.html&view=preview&ctl=1" style="width: 100%; aspect-ratio: 4 / 3;">

## Dependencies

Now comes the dreaded question of dependencies. I needed to use Vite for this demo because it can bundle dependencies from `node_modules` correctly, but if you don't use a bundler, how can you use this?

To be honest, I'm not sure yet. Lea Verou has written a great post recently titled [Web dependencies are broken. Can we fix them?](https://lea.verou.me/blog/2026/web-deps/) that gives a solid overview of the problem of dependencies, and she even has a WIP project called [`nudeps`](https://github.com/nudeps/nudeps) for this purpose. Then there's also [JSPM](https://jspm.org/), a project that I also learned about from that post, it seems to be a mature solution for this problem, but the actual steps of getting a package to install/declare its dependencies automatically is not clear to me. I promise to figure this out and write a follow-up, but for now, I will begrudgingly accept that the end users will need a bundler.

## Release when?

I built this little component as a building block for a larger project that I'm working on, and I also added a few more features:

- support for non-button focusable elements
- support for vertical toolbar orientations
- remembering which element in the toolbar last had focus
- correct handling of hidden elements

I will release it to GitHub and npm once I figure out the last quirks and that dependency stuff. Follow me on [Bluesky](https://bsky.app/profile/illright.me) to hear about it!
