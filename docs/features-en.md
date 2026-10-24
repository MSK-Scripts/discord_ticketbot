# Features and commands

What the bot can do, every slash command and every button. Back to the [README](../README.md) · [Deutsch](features-de.md)

## Features

| Feature | Description |
|---|---|
| 🎫 Ticket types | Up to 25 types, each with its own emoji, color, category, staff roles, start priority and questions |
| 📋 Questionnaires | Up to 5 questions in a modal when a ticket is opened. The answers appear in the ticket and in the transcript |
| 🎛️ Panel | Button or select menu, optional logo and banner. The `/setup` panel refreshes itself on every start |
| 🙋 Claim system | Claim and unclaim per button or command, embed and channel topic update automatically |
| 🔴 Priorities | Low, Medium, High, Urgent. Predefined per ticket type or set with `/priority` |
| 🛡️ Type-specific staff | A ticket type with its own `staffRoles` is handled by those roles only, for channel access and for every staff action |
| 🚧 Open restrictions | Blocked roles, per-type `cantAccess`, a blacklist and a per-user open limit that cannot be raced |
| 📝 Staff notes | Private notes per ticket with `/note` |
| 🔀 Move ticket | Move a ticket to another type and category, with the matching permissions |
| 🔒 Lock | Lock a ticket so the creator and added users can no longer write |
| ♻️ Reopen | Reopen a closed ticket per button or `/reopen`, restores access and category |
| ⏰ Auto-close | Closes inactive tickets after a warning, can be paused per ticket with `/autoclose` |
| ⏰ Staff reminder | Pings the ticket's staff roles when nobody answered within X hours |
| ⭐ Ratings | 1 to 5 stars with an optional comment, posted to a channel with the ticket category and the user's avatar. Staff can reply on the post via the **Comment Feedback** context menu |
| 📄 HTML transcripts | Self-contained HTML in a **modern** or **classic** design. Avatars, custom emojis and, without an API key, the images are embedded, so the file works offline |
| 🔗 Hosted transcripts | With an MSK API key, transcripts are uploaded and shared as a link, optionally under your own domain. See [Service setup](setup-en.md) |
| 💬 Canned responses | Snippets with placeholders and autocomplete, defined in `snippets.jsonc` |
| 📢 Broadcast | One message to every open ticket |
| 🔔 User notifications | Optional "Notify me" button, the creator gets a DM when staff replies |
| 📊 Statistics | Server-wide and per-user stats with `/stats` |
| 🎮 Dynamic status | Shows the number of open tickets in the bot status |
| 🌍 Seven languages | English, German, French, Spanish, Portuguese, Polish and Hungarian, for the bot and for the transcript |
| 🗄️ Flexible database | SQLite out of the box, optional MySQL, MariaDB or PostgreSQL, with a migration script |
| 🔄 Update notice | Checks GitHub releases on start and posts new versions to the log channel |
| 🖥️ Web dashboard | Optional browser dashboard: tickets, stats, config editor, bot control, permissions, an end-user portal. See [Dashboard](dashboard-en.md) |
| 🐳 Docker | Official images for `linux/amd64` and `linux/arm64` |

## Slash commands

| Command | Who | Description |
|---|---|---|
| `/setup` | Administrator | Send the ticket panel to `openTicketChannelId` |
| `/close [reason]` | `closeOption.whoCanCloseTicket` | Close the current ticket |
| `/reopen` | `reopenOption.whoCanReopen` | Reopen a closed ticket |
| `/claim` · `/unclaim` | Staff | Claim or release the ticket |
| `/move` | Staff | Move the ticket to another type |
| `/add <user>` · `/remove <user>` | Staff | Add or remove a user |
| `/rename <name>` | Staff | Rename the ticket channel |
| `/priority <level>` | Staff | Set low, medium, high or urgent |
| `/note add <text>` · `/note list` | Staff | Private staff notes |
| `/lock lock [reason]` · `/lock unlock` | Staff | Lock or unlock the ticket |
| `/autoclose pause` · `/autoclose resume` | Staff | Pause or resume auto-close and the staff reminder for this ticket |
| `/transcript` | Staff | Generate the HTML transcript now |
| `/snippet send <name>` · `/snippet list` | Staff | Send or list canned responses |
| `/broadcast <message> [type] [embed]` | Staff | Message every open ticket |
| `/blacklist add/remove/list` | Manage Server | Manage the blacklist |
| `/stats [user]` | Staff | Server or user statistics |

"Staff" means the staff roles of the ticket's type, or the global `rolesWhoHaveAccessToTheTickets` for types without their own. Administrators always count as staff. `/setup` and `/blacklist` ship with a default permission that the server admin can widen under *Server Settings → Integrations*.

### Context menu

| Entry | Target | Who | Description |
|---|---|---|---|
| **Comment Feedback** | A posted rating (right click → Apps) | `ratingSystem.commentRoles`, otherwise staff | Adds a team comment to the rating embed. A second comment by the same person replaces the first |

## Buttons

| Button | Shown when | Description |
|---|---|---|
| 🔒 Close | `closeOption.closeButton` | Close the ticket, optionally with a reason |
| 🙋 Claim / 🙌 Unclaim | `claimOption.claimButton` | Toggles between the two |
| 🔀 Move | More than one ticket type | Choose a new type |
| 🔕 Notify me | `userNotifications.enabled` | The creator opts in to DM notifications |
| 🗑️ Delete | After closing | Delete the channel after a confirmation |
| ♻️ Reopen | After closing, `reopenOption.button` | Reopen the ticket |
| ⭐ 1 to 5 | Rating request after closing | Only the ticket creator can rate |

## Channel states

| State | Channel name | Channel topic |
|---|---|---|
| Opened | `ticket-username` | `🟡 Medium` |
| `/priority urgent` | unchanged | `🔴 Urgent` |
| Claimed | per `claimOption.nameWhenClaimed` | `🟡 Medium \| 🙋 Claimed by @Staff` |
| Locked | unchanged | unchanged, lock notice in the channel |
| Closed | `closed-ticket-username` | unchanged, buttons disabled |
| Reopened | `ticket-username` | restored, ticket buttons posted again |

Discord allows two channel renames per 10 minutes. Closing and reopening the same ticket several times in a row can leave the name on `closed-…` for a few minutes; it corrects itself.
