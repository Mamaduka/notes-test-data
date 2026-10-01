# Notes Test Data

A small WordPress plugin that generates content with notes for testing the block editor's Notes feature. One click appends classic literature passages to the current post and attaches notes in a range of states, written by users who already exist on the site.

## Usage

1. Copy the plugin folder into `wp-content/plugins/` and activate it.
2. Create a new post and find the **Generate notes** button at the bottom of the **Post** sidebar tab.
3. Click it.

The plugin adds the blocks to the end of the post, creates the notes, and saves the post. Each click adds a new set, so start from an empty post.

## What it generates

The content is public domain text: Pride and Prejudice, Moby-Dick, A Tale of Two Cities, Frankenstein, Jane Eyre, Alice's Adventures in Wonderland, and quotes from Anna Karenina, The Great Gatsby, and Hamlet.

| Case                                                                | Block     |
| ------------------------------------------------------------------- | --------- |
| A single note stored as a scalar `metadata.noteId` (older format)   | Paragraph |
| An inline note with replies                                         | Paragraph |
| A note on a list                                                    | List      |
| A resolved thread                                                   | Heading   |
| Two threads on the same block                                       | Paragraph |
| A block without notes between blocks with notes                     | Paragraph |
| A thread with replies from many authors, to show avatar overflow    | Paragraph |
| A thread that was resolved and then reopened                        | Paragraph |
| One block-level note and two inline notes on the same block         | Paragraph |
| A long note                                                         | Paragraph |
| Several notes on blocks in a row, to check how floating notes stack | Quote     |
| A note whose block no longer exists                                 | None      |

## Authors

The plugin does not create users. It fetches the site's authors with the `core-data` `getUsers` selector and rotates through them as note authors. With a single user, every note comes from that user, so add a few users first to see different avatars. Notes are dated a few minutes apart, starting three days in the past, so their order is predictable.

## Requirements

- WordPress 6.9 or later, or the Gutenberg plugin.
- A user with the `moderate_comments` capability, such as an administrator. The REST API only allows creating notes on behalf of other users with this capability.

WordPress emails the post author about each note written by another user, so generating data sends several emails. Use a mail catcher on your local site.

## Development

There is no build step. `index.js` uses the `wp.*` script globals and `createElement` directly, so you can edit it and reload the editor.

Run `npm install` once, then `npm run format` to format the code with the WordPress Prettier config.

## License

GPL-2.0-or-later
