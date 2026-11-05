/**
 * Identifies this deployment. Pass it as an argument to "use cache" loaders that can return
 * "not found": cache entries survive across deployments, so without it a slug requested before
 * its company existed keeps serving the cached 404 after the deploy that adds it.
 */
export const BUILD = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
