# Code Connect — Examples and Troubleshooting

---

## Worked Examples

### Example 1: Connecting a Button Component

User says: "Connect this Figma button to my code: https://figma.com/design/kL9xQn2VwM8pYrTb4ZcHjF/DesignSystem?node-id=42-15"

**Actions:**

1. Parse URL: fileKey=`kL9xQn2VwM8pYrTb4ZcHjF`, nodeId=`42-15` → convert to `42:15`
2. Run `get_code_connect_suggestions(fileKey="kL9xQn2VwM8pYrTb4ZcHjF", nodeId="42:15")`
3. Response shows: Button component (unmapped) with `variant` (primary/secondary) and `size` (sm/md/lg) properties, plus a thumbnail image
4. Search codebase for Button components: Find `src/components/Button.tsx`
5. Read `Button.tsx` and confirm it has `variant` and `size` props
6. Present to user:
   ```
   I found a match:
   - `Button` (`src/components/Button.tsx`): Button at node ID [42:15](https://figma.com/design/kL9xQn2VwM8pYrTb4ZcHjF/DesignSystem?node-id=42-15)

   Would you like to connect this component?
   ```
7. User confirms: "Yes"
8. Detect TypeScript React component
9. Run `send_code_connect_mappings(fileKey="kL9xQn2VwM8pYrTb4ZcHjF", nodeId="42:15", mappings=[{ nodeId: "42:15", componentName: "Button", source: "src/components/Button.tsx", label: "React" }])`

**Result:** Figma button component is now connected to the code Button component.

---

### Example 2: Multiple Components with Partial Selection

User says: "Connect components in this frame: https://figma.com/design/pR8mNv5KqXzGwY2JtCfL4D/Components?node-id=10-50"

**Actions:**

1. Parse URL: fileKey=`pR8mNv5KqXzGwY2JtCfL4D`, nodeId=`10-50` → convert to `10:50`
2. Run `get_code_connect_suggestions(fileKey="pR8mNv5KqXzGwY2JtCfL4D", nodeId="10:50")`
3. Response shows 3 unmapped components: ProductCard, Badge, and CustomWidget
4. Search codebase:
   - ProductCard: Found `src/components/ProductCard.tsx` (props match)
   - Badge: Found `src/components/Badge.tsx` (props match)
   - CustomWidget: No matching component found
5. Present to user:
   ```
   The following components match the design:
   - `ProductCard` (`src/components/ProductCard.tsx`): ProductCard at node ID `10:51`
   - `Badge` (`src/components/Badge.tsx`): Badge at node ID `10:52`

   I couldn't find a match for CustomWidget (10:53).

   Would you like to connect these components? You can accept all, select specific ones, or skip.
   ```
6. User: "Just connect ProductCard, skip Badge for now"
7. Run `send_code_connect_mappings(...)` with only ProductCard mapping

**Result:** Only ProductCard is connected, per the user's selection.

---

### Example 3: Component Needs Creation

User says: "Connect this icon: https://figma.com/design/8yJDMeWDyBz71EnMOSuUiw/Icons?node-id=5-20"

**Actions:**

1. Parse URL: fileKey=`8yJDMeWDyBz71EnMOSuUiw`, nodeId=`5-20` → convert to `5:20`
2. Run `get_code_connect_suggestions(fileKey="8yJDMeWDyBz71EnMOSuUiw", nodeId="5:20")`
3. Response shows: CheckIcon component (unmapped) with color and size properties
4. Search codebase for CheckIcon: No matches found
5. Search for generic Icon components: Find `src/icons/` directory
6. Report to user: "I couldn't find a CheckIcon component, but found an icons directory at src/icons/. Would you like to:
   - Create a new CheckIcon.tsx component first, then connect it
   - Connect to a different existing icon
   - Provide the path to the CheckIcon if it exists elsewhere"
7. User provides path: "src/icons/CheckIcon.tsx"
8. Run `send_code_connect_mappings(fileKey="8yJDMeWDyBz71EnMOSuUiw", nodeId="5:20", mappings=[{ nodeId: "5:20", componentName: "CheckIcon", source: "src/icons/CheckIcon.tsx", label: "React" }])`

**Result:** CheckIcon component is successfully connected.

---

## Common Issues and Solutions

### "No published components found in this selection"
**Cause:** The Figma component is not published to a team library.
**Solution:**
1. In Figma, select the component or component set
2. Right-click → "Publish to library" or use Team Library publish modal
3. Publish the component
4. Retry with the same node ID

### "Code Connect is only available on Organization and Enterprise plans"
**Cause:** Plan does not include Code Connect access.
**Solution:** Upgrade to Organization or Enterprise plan, or contact administrator.

### No matching component found in codebase
**Cause:** Search did not find a component with matching name or structure.
**Solution:** Ask the user if the component exists under a different name or location. May need to create the component first.

### "Published component not found" (CODE_CONNECT_ASSET_NOT_FOUND)
**Cause:** Source file path is incorrect or component doesn't exist at that location.
**Solution:** Verify the source path is correct and relative to project root. Check that the component is properly exported with the exact `componentName` specified.

### "Component is already mapped to code" (CODE_CONNECT_MAPPING_ALREADY_EXISTS)
**Cause:** A Code Connect mapping already exists for this component.
**Solution:** Component is already connected. To update, remove the existing mapping in Figma first.

### "Insufficient permissions" (CODE_CONNECT_INSUFFICIENT_PERMISSIONS)
**Cause:** User does not have edit permissions on the Figma file or library.
**Solution:** Requires edit access to the file. Contact file owner or team admin.

### URL errors / missing node-id
**Cause:** Figma URL format is incorrect or missing the `node-id` parameter.
**Solution:** Verify format: `https://figma.com/design/:fileKey/:fileName?node-id=1-2`. The `node-id` parameter is required. Convert `1-2` → `1:2` when calling tools.

### Multiple similar components found
**Cause:** Codebase has multiple components that could match.
**Solution:** Present all candidates to the user with file paths and let them choose.

---

## Best Practices

### Proactive Component Discovery
Don't just ask for the file path — actively search the codebase to find matching components.

### Accurate Structure Matching
Look beyond names. Check that:
- Props align (variant types, size options, etc.)
- Component hierarchy matches (nested elements)
- Component serves the same purpose

### Handle Ambiguity
If multiple components could match, present options rather than guessing.

### Graceful Degradation
If no exact match: show close candidates, suggest component creation, ask for user guidance.

---

## Understanding Code Connect

Code Connect establishes a bidirectional link between design and code:
- **For designers:** See which code component implements a Figma component
- **For developers:** Navigate from Figma designs directly to implementing code
- **For teams:** Maintain a single source of truth for component mappings

---

## Additional Resources

- [Code Connect Documentation](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect)
- [Figma MCP Server Tools and Prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
