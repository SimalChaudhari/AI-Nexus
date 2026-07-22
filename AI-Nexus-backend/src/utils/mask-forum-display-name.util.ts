/**
 * Public forum display handle, e.g. "Yi" + "Chu" → "@Yi***Chu**".
 * Admin responses can also include real `id` + `email` for lookup / reply.
 */
export function maskForumDisplayName(
    firstname?: string | null,
    lastname?: string | null,
    username?: string | null,
): string {
    const first = String(firstname || '').trim();
    const last = String(lastname || '').trim();

    if (first || last) {
        const firstPart = first.slice(0, 2);
        const lastPart = last.slice(0, 3);
        return `@${firstPart}***${lastPart}**`;
    }

    const user = String(username || '').trim();
    if (user.length >= 4) {
        return `@${user.slice(0, 2)}***${user.slice(-2)}**`;
    }
    if (user.length > 0) {
        return `@${user}***`;
    }

    return '@Anonymous**';
}

export type ForumPublicUser = {
    id: string;
    maskedDisplayName: string;
    firstname?: string | null;
    lastname?: string | null;
    username?: string | null;
    email?: string | null;
};

export function toForumPublicUser(
    user: {
        id: string;
        firstname?: string | null;
        lastname?: string | null;
        username?: string | null;
        email?: string | null;
    } | null | undefined,
    options?: { includeContact?: boolean },
): ForumPublicUser | null {
    if (!user?.id) return null;

    const maskedDisplayName = maskForumDisplayName(user.firstname, user.lastname, user.username);

    // Public: masked handle only (+ id for ownership checks). No PII.
    if (!options?.includeContact) {
        return {
            id: user.id,
            maskedDisplayName,
        };
    }

    // Admin: actual id + email for lookup / reply.
    return {
        id: user.id,
        maskedDisplayName,
        firstname: user.firstname ?? null,
        lastname: user.lastname ?? null,
        username: user.username ?? null,
        email: user.email ?? null,
    };
}
