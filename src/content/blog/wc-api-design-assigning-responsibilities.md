---
title: "Web Component API Design: Assign responsibilities"
description: If your web component doesn't control its children, how will it teach them how to behave?
pubDate: Feb 24 2026
---
Light DOM Web Components (also known as HTML Web Components) are _my favorite_ and I want to help popularize the format by sharing how I approach the design of their API. To give a refresher, the core premise of Light DOM Web Components is that their entire structure is written in HTML by the consumer. Shadow DOM is typically not used, though it can be used to replace a less functional native element with a more functional custom one while still including the Light DOM structure. Here's a simple example:

<figure>

```html
<pristine-form-guard>
	<form>
		<label for="username">Username</label>
		<input id="username" type="text" />
		
		<label for="password">Password</label>
		<input id="password" type="password" />
		
		<button type="submit">Log in</button>
	</form>
</pristine-form-guard>
```

<figcaption>A web component that prevents form submissions until the fields have some input to submit.</figcaption>

</figure>

This has a few lovely benefits:

1. A lot of flexibility offered to the consumer on how she wants to structure her markup and style the content
2. The API stays clear and minimal, no need to remember and write out 10 HTML attributes for, say, translating the component
3. Progressive enhancement — if the web component didn't load (yet), you can still perform the core actions
4. No complex SSR pipeline needed

This works great for simple components like the hypothetical one in the example above, but what about components that can't afford such straightforward internal markup?

## Case study: rich text editor

Let's consider the design of a Light DOM API for a rich text editor component. It will have a text editor and a toolbar with formatting actions above. Some of these actions will likely have popups with more precise controls, such as heading level.

The markup will probably look a little something like this (note the `tool-bar` component from [an earlier post!](./aria-toolbar-web-component)):

<figure>

```html
<rich-text-editor>
	<tool-bar>
		<button commandfor="headings" command="toggle-popover">
			Headings
		</button>
		<tool-bar orientation="vertical" id="headings" popover>
			<button>Heading 1</button>
			<button>Heading 2</button>
		</tool-bar>
		
		<button>Bold</button>
		<button>Italic</button>
		<!-- … -->
	</tool-bar>
	
	<textarea name="description">
		Initial value with <strong>formatting</strong>!
	</textarea>
</rich-text-editor>
```

<figcaption>A rich text editor component. It has a textarea with initial input and form-relevant attributes, which will be replaced with a content-editable node that is capable of rich text editing. It also has a toolbar with a sample of the typical rich text actions, including one that renders a popover.</figcaption>

</figure>

And here's where we see a problem — attaching to the text area is easy, but how do we map each individual formatting action to its corresponding button? I can think of a few reasonable approaches that I will compare below, but first let's clear out some less reasonable ones:

1. Custom class names like `class="rte-bold"` — feels wrong to be using classes for this reason (or any other reason apart from styling, for that matter), also possible collisions, however unlikely they might be
2. Assigning actions to elements sequentially as they appear in the HTML tree: first button is bold, second is italic, etc. — this is so obscure that it feels like a deliberately malicious design to inflict pain

Now for the approaches you might actually want to consider!

### Data attributes

<figure>

```html
<rich-text-editor>
	<tool-bar>
		<button commandfor="headings" command="toggle-popover" data-all-headings>
			Headings
		</button>
		<tool-bar orientation="vertical" id="headings" popover>
			<button data-action="toggle-heading" data-heading-level="1">
				Heading 1
			</button>
			<button data-action="toggle-heading" data-heading-level="2">
				Heading 2
			</button>
		</tool-bar>
		
		<button data-action="mark" data-type="bold">Bold</button>
		<button data-action="mark" data-type="italic">Italic</button>
		<!-- … -->
	</tool-bar>
	
	<textarea name="description">
		Initial value with <strong>formatting</strong>!
	</textarea>
</rich-text-editor>
```

<figcaption>

The `data-all-headings` attribute lights up the button to indicate that the editor cursor is placed on a heading, the `data-action` attribute specifies the type of action, and the other data attributes are modifiers to the actions.

</figcaption>

</figure>

Data attributes are nice because they are completely valid and safe extensions of HTML for native elements. Since you can give them any name you want, they are also quite expressive, and I don't see the need to namespace them (say, `data-rte-action`) because collisions with other libraries are unlikely. Another benefit is that you don't have to cram several values into one attribute — notice how the heading buttons instead have a separate attribute for specifying the level. To top it all off, they have a convenient JS API for reading and writing — the [`dataset` attribute](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset).

With all of that in mind, I don't really like them. I find the `data-` prefix adds noise to the markup and I prefer to use them for keeping element state rather than handwritten configuration options.

### IDs and "for"-like attributes

Taking inspiration from how label elements attach to form fields, we can define our own "for"-like attributes on our root component:

<figure>

```html
<rich-text-editor
	bold-control="my-bold"
	italic-control="my-italic"
	all-headings-control="my-heading:all"
	heading-1-control="my-heading:1"
	heading-2-control="my-heading:2"
>
	<tool-bar>
		<button id="my-heading:all" commandfor="headings" command="toggle-popover">
			Headings
		</button>
		<tool-bar orientation="vertical" id="headings" popover>
			<button id="my-heading:1">
				Heading 1
			</button>
			<button id="my-heading:2">
				Heading 2
			</button>
		</tool-bar>
		
		<button id="my-bold">Bold</button>
		<button id="my-italic">Italic</button>
		<!-- … -->
	</tool-bar>
	
	<textarea name="description">
		Initial value with <strong>formatting</strong>!
	</textarea>
</rich-text-editor>
```

<figcaption>

All the controls are linked their by ID from the main `rich-text-editor` element. Similarly to the previous example, the `my-heading:all` button is linked to allow the editor to react to the cursor being placed on a heading.

</figcaption>

</figure>

Yeah… and that's just for a few buttons, most of the toolbar actions are not even included in this example. I don't think I need to say much about the drawbacks of this approach for an element that has lots of internal controls, but three things deserve a special callout. 

First, this is where we see the "cramming several values" problem. Since IDs have to be unique, we cannot mark all heading buttons with the same ID and then supply options through another mechanism, so we get even more verbosity. 

Second — humans are bad at coming up with IDs! I've always felt nervous when a built-in API or a library required me to specify IDs because they **must** be unique. How do I ensure that this particular ID doesn't appear anywhere else on the page? These worries have been greatly reduced when React introduced their `useId` hook — brilliant, it should be the framework's job to maintain uniqueness, not mine.

Third, it feels a little weird to be connecting an element _with its ancestor_ through an ID. That's not how labels work, for instance, if an input is wrapped with a label, that label is implicitly connected to that input. Native HTML elements didn't run up against this issue of having to distinguish between several elements. Perhaps they designed around it, and so we should too?

It wouldn't feel fair to bash this approach without mentioning its benefits, though. I think where it really shines is when you only need to attach 1 or 2 elements and these elements are elsewhere in the HTML tree, and the insides of your web component are already used for something else. For example:

<figure>

```html
<unsaved-changes-guard confirm-with="tax-declaration-confirmation">
	<form>
		<!-- 600 fields… -->
		<button type="submit">Submit tax declaration</button>
	</form>
</unsaved-changes-guard>

<dialog id="tax-declaration-confirmation">
	<h1>Unsaved changes in the form!</h1> 
	<p>Would you like to save them for the next session?</p>
	<form method="dialog">
		<button value="save">Yes, save</button>
		<button value="cancel">Stay on the page</button>	
	</form>
</dialog>
```

<figcaption>A web component that prevents you from accidentally leaving or refreshing the page by showing you a confirmation dialog if you have any input in the form. This component is connected to the desired dialog instance by referencing its ID.</figcaption>

</figure>

With this design, you can keep your confirmation dialog elsewhere in the tree and possibly even reuse it across several forms. This method could work alongside the simple nesting of the confirmation dialog inside `<unsaved-changes-guard>`, assuming that it is configured to treat a direct child `<dialog>` as the confirmation dialog.

Why would you want to keep the dialog elsewhere in the tree? Well, if your component might be nested inside a `<form>` element, for example, suddenly you are no longer able to specify dialogs inside, at least not the ones that close declaratively, since nesting form elements is prohibited by HTML.

### Wrapping in custom elements

I heard you like custom elements, so I put custom elements in your custom elements:

<figure>

```html
<rich-text-editor>
	<tool-bar>
		<rte-is-heading>
			<button commandfor="headings" command="toggle-popover">
				Headings
			</button>
		</rte-is-heading>
		<tool-bar orientation="vertical" id="headings" popover>
			<rte-make-heading level="1">
				<button>Heading 1</button>
			</rte-make-heading>
			<rte-make-heading level="2">
				<button>Heading 2</button>
			</rte-make-heading>
		</tool-bar>
		
		<rte-mark type="bold">
			<button>Bold</button>
		</rte-mark>
		<rte-mark type="italic">
			<button>Italic</button>
		</rte-mark>
		<!-- … -->
	</tool-bar>
	
	<textarea name="description">
		Initial value with <strong>formatting</strong>!
	</textarea>
</rich-text-editor>
```

<figcaption>

The `rte-is-heading` custom element lights up the button to indicate that the editor cursor is placed on a heading, and the rest of the inner custom elements just delegate their action to the button inside.

</figcaption>

</figure>

Yikes, this is XML levels of verbosity! And not only that, but the `rte-` prefix really is necessary here since there is a genuine possibility of there being another custom element called `is-heading` or `mark-text`. Looking at that, you'd be forgiven for thinking to yourself: "Who in the world would want to write that?"

I'm very sorry to report that it's me, I wanted to write that. When I designed my web components that needed to designate specific functions to specific children, this is the approach I landed on. I quickly counted the DOM elements in a fully-featured rich text editor built with this design (not even considering the rich text itself), and it's **112 elements**! Lighthouse starts complaining at 800 elements, so having just 7 instances of this component along with a little surrounding markup already gets you over that line. But now that we firmly established that this is an unsuitable design, allow me to defend it a little bit and explain my reasoning.

The first thing I liked about it is that this approach naturally lends itself to proper separation of concerns. I can build the `rte-mark` component independently from others and simply pull the editor instance from the main component using the [Context API](https://lit.dev/docs/data/context/). This keeps its logic clean and the file small, although there is some repetition between each button.

The second nice thing is that this approach separates the _what_ from the _how_. In other words, the action is the tag name, and the modifiers, such as heading level, are attributes.

Finally, it plays well with the whole Light DOM approach to designing web components — each component is a little piece of functionality, and the presentation is entirely up to the consumer.

I didn't have much of a problem with verbosity because I figured you only need to write it once in a template and then use your framework or templating engine to add as many of them as you want. The DOM node burden did concern me, however, so I ended up leaving this approach behind and going back to the drawing board.

### Invoker commands

Then I remembered that new exciting HTML feature — the [Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API). You've already seen it in the examples before, it's how a button can open a popover without needing any JavaScript:

```html
<button commandfor="headings" command="toggle-popover">
	Headings
</button>
<tool-bar id="headings" popover>
	<button>Heading 1</button>
	<button>Heading 2</button>
</tool-bar>
```

I remembered that the explainer for this feature also mentioned that you could specify custom commands with the `--` prefix, a feature that I found interesting but useless at the time. This is exactly what it's for!

<figure>

```html
<rich-text-editor>
	<tool-bar>
		<rte-is-heading>
			<button commandfor="headings" command="toggle-popover">
				Headings
			</button>
		</rte-is-heading>
		<tool-bar orientation="vertical" id="headings" popover>
			<button command="--make-heading" data-level="1">Heading 1</button>
			<button command="--make-heading" data-level="2">Heading 2</button>
		</tool-bar>
		
		<button command="--mark" data-type="bold">Bold</button>
		<button command="--mark" data-type="italic">Italic</button>
		<!-- … -->
	</tool-bar>
	
	<textarea name="description">
		Initial value with <strong>formatting</strong>!
	</textarea>
</rich-text-editor>
```

<figcaption>

A blend of approaches: actions are assigned with the `command` attribute, action modifiers are specified with data attributes, and custom elements handle special display properties, like the Headings button that lights up when the editor cursor is placed on a heading.

</figcaption>

</figure>

Here we see the value-cramming problem again, avoided using a separate data attribute. We could technically make the commands `--make-heading-1` and `--mark-bold` and it wouldn't complicate the handler too much — all commands are dispatched as the same `"command"` event and we can parse the command name using JavaScript. I don't want to add command name parsing into my list of responsibilities though, and I'm able to gaslight myself into thinking that _this particular_ usage of data attributes is different from using them for commands.

This approach can also separate concerns nicely since you can attach as many command listeners to an element as you want, and each one can handle its own command and pass the rest to the others.

Notice also that I didn't specify `commandfor` on the buttons. We can make the interface cleaner by having the main `<rich-text-editor>` component do a search in its subtree for buttons with recognized commands and assign itself as the `commandForElement` in JavaScript. That way we get the benefit of being able to mount the button elsewhere in the DOM tree if needed, and get a clean interface otherwise.

Invoker Commands API is Baseline available since 2025, but it's also not difficult to polyfill, so I have no worries about browser compatibility at all. Speaking of which, here's [a great polyfill](https://github.com/keithamus/invokers-polyfill) by Keith Cirkel!

## What have we learned?

I've decided on my preferred approach for assigning responsibilities inside Light DOM Web Components — invoker commands mostly, with a few data attributes and inner custom elements sprinkled in. However, we also identified some desirable characteristics of such a method:

- Reuses existing HTML semantics as much as possible
- Avoids collisions with other things naturally without namespacing
- Has natural value separation without having to parse strings
- Local to the element that gets assigned the responsibility rather than bulking up the main component's attributes
- Works not just in the subtree of the main component, but is also able to reach across the DOM
- Has minimal negative impact on page performance

If one of these characteristics is more important to you than another, you might want to choose a different approach, and if you do, please let me know! Also let me know if you come up with an approach that hits these characteristics even better. You can tag me on [Bluesky](https://bsky.app/profile/illright.me) :)

~~Implementing the designs above is left as an exercise for the reader.~~
