import * as migration_20250929_111647 from './20250929_111647'
import * as migration_20260423_190000_blog from './20260423_190000_blog'
import * as migration_20260423_210000_comments from './20260423_210000_comments'
import * as migration_20260423_220000_layout_links from './20260423_220000_layout_links'
import * as migration_20260423_230000_pages from './20260423_230000_pages'
import * as migration_20260423_233000_redirects from './20260423_233000_redirects'

export const migrations = [
  {
    up: migration_20250929_111647.up,
    down: migration_20250929_111647.down,
    name: '20250929_111647',
  },
  {
    up: migration_20260423_190000_blog.up,
    down: migration_20260423_190000_blog.down,
    name: '20260423_190000_blog',
  },
  {
    up: migration_20260423_210000_comments.up,
    down: migration_20260423_210000_comments.down,
    name: '20260423_210000_comments',
  },
  {
    up: migration_20260423_220000_layout_links.up,
    down: migration_20260423_220000_layout_links.down,
    name: '20260423_220000_layout_links',
  },
  {
    up: migration_20260423_230000_pages.up,
    down: migration_20260423_230000_pages.down,
    name: '20260423_230000_pages',
  },
  {
    up: migration_20260423_233000_redirects.up,
    down: migration_20260423_233000_redirects.down,
    name: '20260423_233000_redirects',
  },
]
