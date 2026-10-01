( function ( wp ) {
	const { apiFetch } = wp;
	const { store: blockEditorStore } = wp.blockEditor;
	const { createBlock } = wp.blocks;
	const { Button } = wp.components;
	const { store: coreStore } = wp.coreData;
	const { useDispatch, useRegistry, useSelect } = wp.data;
	const { PluginPostStatusInfo, store: editorStore } = wp.editor;
	const { createElement: el, useState } = wp.element;
	const { store: noticesStore } = wp.notices;
	const { registerPlugin } = wp.plugins;

	// Same query the post author control uses.
	const AUTHORS_QUERY = {
		who: 'authors',
		per_page: 100,
		context: 'view',
		_fields: 'id,name',
	};

	const MINUTE = 60 * 1000;

	const CROWD_REPLIES = [
		'Agreed.',
		'Splitting it would lose the rhythm.',
		'Maybe split after "the age of foolishness"?',
		'+1 to keeping it whole.',
		'Could we bold the contrasts instead?',
		'The repetition is the whole point.',
		'Readers on mobile will struggle with this one.',
		'Let us try both versions and compare.',
	];

	/*
	 * Each entry becomes one block. `threads` are the notes attached to it:
	 * - `replies`: reply contents, each by the next author.
	 * - `inline`: phrase wrapped in a `core/note` marker.
	 * - `crowd`: replies from as many distinct authors as possible.
	 * - `status`: 'resolved', or 'reopened' (resolved, then reopened).
	 * `legacyId` stores a scalar `metadata.noteId` instead of an array.
	 * `orphan` creates the notes without a block.
	 */
	const CONTENT = [
		{ block: 'core/heading', text: 'Pride and Prejudice' },
		{
			block: 'core/paragraph',
			text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
			legacyId: true,
			threads: [
				{
					note: 'Classic opening. Should we pull this into a pull quote?',
				},
			],
		},
		{
			block: 'core/paragraph',
			text: 'However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.',
			threads: [
				{
					note: 'This phrase might read as harsh to modern readers. Keep it?',
					inline: 'rightful property',
					replies: [
						'Keep it. The irony is the point.',
						'Agreed, Austen is being sarcastic here.',
					],
				},
			],
		},
		{
			block: 'core/list',
			items: [
				'Jane',
				'Elizabeth',
				'Mary',
				'Catherine (Kitty)',
				'Lydia',
			],
			threads: [
				{
					note: 'Should we list the sisters by age?',
					replies: [ 'They already are, eldest first.' ],
				},
			],
		},
		{
			block: 'core/heading',
			text: 'Moby-Dick',
			threads: [
				{
					note: 'Is it "Moby Dick" or "Moby-Dick"?',
					replies: [
						'The first American edition hyphenates the title. The whale has no hyphen.',
					],
					status: 'resolved',
				},
			],
		},
		{
			block: 'core/paragraph',
			text: 'Call me Ishmael.',
			threads: [
				{
					note: 'Shortest paragraph in the post. Intentional?',
					replies: [ 'Yes, it should stand alone.', 'Fine by me.' ],
				},
				{
					note: 'Can we link this to the full text on Project Gutenberg?',
				},
			],
		},
		{
			block: 'core/paragraph',
			text: 'It is a way I have of driving off the spleen and regulating the circulation.',
		},
		{ block: 'core/heading', text: 'A Tale of Two Cities' },
		{
			block: 'core/paragraph',
			text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going direct to Heaven, we were all going direct the other way.',
			threads: [
				{
					note: 'This sentence is very long. Can we split it?',
					crowd: true,
				},
			],
		},
		{ block: 'core/heading', text: 'Frankenstein' },
		{
			block: 'core/paragraph',
			text: 'You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.',
			threads: [
				{
					note: 'Should we mention this is the first letter to Mrs. Saville?',
					replies: [ 'Added it to the intro.' ],
					status: 'reopened',
					reopen: 'Reopening, the intro still does not mention her.',
				},
			],
		},
		{ block: 'core/heading', text: 'Jane Eyre' },
		{
			block: 'core/paragraph',
			text: 'There was no possibility of taking a walk that day. We had been wandering, indeed, in the leafless shrubbery an hour in the morning; but since dinner (Mrs. Reed, when there was no company, dined early) the cold winter wind had brought with it clouds so sombre, and a rain so penetrating, that further out-door exercise was now out of the question.',
			threads: [
				{
					note: 'Nice mood setter for the autumn issue.',
					replies: [ 'Agreed, let us lead with it.' ],
				},
				{
					note: 'British spelling. Keep "sombre"?',
					inline: 'sombre',
				},
				{
					note: 'The parenthetical breaks the flow a little.',
					inline: '(Mrs. Reed, when there was no company, dined early)',
					replies: [
						'It is the original text, we should not edit it.',
					],
				},
			],
		},
		{ block: 'core/heading', text: 'Alice’s Adventures in Wonderland' },
		{
			block: 'core/paragraph',
			text: 'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, “and what is the use of a book,” thought Alice “without pictures or conversations?”',
			threads: [
				{
					note: 'Since Alice asks for pictures, we should add one of the original Tenniel illustrations here. The White Rabbit would work best, as it appears in the next paragraph and sets up the rest of the chapter. We need to check the image is from a public domain scan and credit the source in the caption. If we cannot find a good scan, a pull quote of the last line would work too, since it already reads like a question to the reader.',
				},
			],
		},
		{ block: 'core/heading', text: 'Quotes' },
		{
			block: 'core/quote',
			text: 'Happy families are all alike; every unhappy family is unhappy in its own way.',
			citation:
				'Leo Tolstoy, Anna Karenina (translated by Constance Garnett)',
			threads: [ { note: 'Credit the translator in the citation.' } ],
		},
		{
			block: 'core/quote',
			text: 'So we beat on, boats against the current, borne back ceaselessly into the past.',
			citation: 'F. Scott Fitzgerald, The Great Gatsby',
			threads: [
				{
					note: 'Public domain since 2021, so we are fine to quote it.',
				},
			],
		},
		{
			block: 'core/quote',
			text: 'To be, or not to be, that is the question:',
			citation: 'William Shakespeare, Hamlet',
			threads: [
				{
					note: 'Ending on a colon looks odd out of context.',
					replies: [ 'It is how the line ends in the play.' ],
				},
			],
		},
		{
			orphan: true,
			threads: [
				{
					note: 'This note belonged to a paragraph that was removed.',
					replies: [ 'It should show up as an orphaned note.' ],
				},
			],
		},
	];

	function toBlock( spec, noteIds, content ) {
		const attributes = noteIds.length
			? { metadata: { noteId: spec.legacyId ? noteIds[ 0 ] : noteIds } }
			: {};

		switch ( spec.block ) {
			case 'core/heading':
				return createBlock( spec.block, {
					...attributes,
					content,
					level: 2,
				} );
			case 'core/quote':
				return createBlock(
					spec.block,
					{ ...attributes, citation: spec.citation },
					[ createBlock( 'core/paragraph', { content } ) ]
				);
			case 'core/list':
				return createBlock(
					spec.block,
					attributes,
					spec.items.map( ( item ) =>
						createBlock( 'core/list-item', { content: item } )
					)
				);
			default:
				return createBlock( 'core/paragraph', {
					...attributes,
					content,
				} );
		}
	}

	async function generateContent( postId, authors ) {
		// Notes are spread over the last few days, in creation order.
		let clock = Date.now() - 3 * 24 * 60 * MINUTE;
		let authorIndex = 0;
		let count = 0;

		// Use `apiFetch` instead of `saveEntityRecord`: each save would refetch
		// the editor's notes query, showing threads before their blocks exist.
		// The caller refetches once after inserting the blocks.
		function createNote( data ) {
			clock += 23 * MINUTE;
			count++;
			return apiFetch( {
				path: '/wp/v2/comments',
				method: 'POST',
				data: {
					post: postId,
					type: 'note',
					status: 'hold',
					parent: 0,
					author: authors[ authorIndex++ % authors.length ].id,
					date_gmt: new Date( clock ).toISOString().slice( 0, 19 ),
					...data,
				},
			} );
		}

		async function createThread( thread ) {
			const root = await createNote( {
				content: thread.note,
				status: thread.status === 'resolved' ? 'approved' : 'hold',
			} );

			const replies = thread.crowd
				? Array.from(
						{
							length: Math.min(
								Math.max( authors.length, 5 ),
								20
							),
						},
						( _, i ) => CROWD_REPLIES[ i % CROWD_REPLIES.length ]
					)
				: ( thread.replies ?? [] );
			for ( const content of replies ) {
				await createNote( { content, parent: root.id } );
			}

			if ( thread.status ) {
				await createNote( {
					content: '',
					parent: root.id,
					status: 'approved',
					meta: { _wp_note_status: 'resolved' },
				} );
			}
			if ( thread.status === 'reopened' ) {
				await createNote( {
					content: thread.reopen,
					parent: root.id,
					meta: { _wp_note_status: 'reopen' },
				} );
			}

			return root.id;
		}

		const blocks = [];
		for ( const spec of CONTENT ) {
			const noteIds = [];
			let content = spec.text;
			for ( const thread of spec.threads ?? [] ) {
				const id = await createThread( thread );
				noteIds.push( id );
				if ( thread.inline ) {
					content = content.replace(
						thread.inline,
						`<mark class="wp-note" data-id="${ id }">${ thread.inline }</mark>`
					);
				}
			}
			if ( ! spec.orphan ) {
				blocks.push( toBlock( spec, noteIds, content ) );
			}
		}

		return { blocks, count };
	}

	function GenerateNotesButton() {
		const [ isBusy, setIsBusy ] = useState( false );
		const registry = useRegistry();
		const authors = useSelect(
			( select ) => select( coreStore ).getUsers( AUTHORS_QUERY ),
			[]
		);
		const { editPost, savePost } = useDispatch( editorStore );
		const { insertBlocks } = useDispatch( blockEditorStore );
		const { invalidateResolutionForStoreSelector } =
			useDispatch( coreStore );
		const { createSuccessNotice, createErrorNotice } =
			useDispatch( noticesStore );

		async function onClick() {
			setIsBusy( true );
			try {
				const { getCurrentPostId, getEditedPostAttribute } =
					registry.select( editorStore );
				const { blocks, count } = await generateContent(
					getCurrentPostId(),
					authors
				);

				if ( ! getEditedPostAttribute( 'title' ) ) {
					editPost( { title: 'Notes test data' } );
				}
				insertBlocks( blocks );
				// Refetch the notes query so the new threads show up.
				invalidateResolutionForStoreSelector( 'getEntityRecords' );
				// Persist the `metadata.noteId` links.
				await savePost();

				createSuccessNotice(
					`Generated ${ count } notes from ${ authors.length } authors.`,
					{ type: 'snackbar' }
				);
			} catch ( error ) {
				createErrorNotice(
					typeof error?.message === 'string' && error.message
						? error.message
						: 'Could not generate notes test data.',
					{ type: 'snackbar' }
				);
			} finally {
				setIsBusy( false );
			}
		}

		return el(
			PluginPostStatusInfo,
			null,
			el(
				Button,
				{
					__next40pxDefaultSize: true,
					variant: 'secondary',
					// Full width, like the "Move to trash" button below.
					style: { flexGrow: 1, justifyContent: 'center' },
					isBusy,
					disabled: isBusy || ! authors?.length,
					accessibleWhenDisabled: true,
					onClick,
				},
				isBusy ? 'Generating…' : 'Generate notes'
			)
		);
	}

	registerPlugin( 'notes-test-data', { render: GenerateNotesButton } );
} )( window.wp );
