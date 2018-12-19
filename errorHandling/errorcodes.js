const Error = require('./error');

/**
 * Holder class for the used API errors.
 */
class Errors {
    /**
     * Similar to 403 Forbidden,
     * but specifically for use when authentication is required and has failed or has not yet been provided.
     * The response must include a X-Access-Token header field containing a challenge applicable to the requested resource.
     * @returns {Error} Not authorized 401.
     */
    static unauthorized() {
        return new Error("Not authorized", 401);
    }

    /**
     * Method that will be used when a user sends an invalid token
     * @returns {Error} Invalid Token 498.
     */
    static noValidToken() {
        return new Error("Invalid Token", 498);
    }

    /**
     * Indicates that the request could not be processed because of conflict in the request
     * @returns {Error} Conflict 409.
     */
    static conflict() {
        return new Error("Conflict", 409);
    }

    /**
     * The server cannot or will not process the request due to an apparent client error
     * e.g., malformed request syntax, size too large, invalid request message framing, or deceptive request routing).
     * @returns {Error} Bad Request 400.
     */
    static badRequest() {
        return new Error("Bad Request", 400);
    }

    /**
     * The request was valid, but the server is refusing action.
     * The user might not have the necessary permissions for a resource, or may need an account of some sort.
     * @returns {Error} Forbidden 403.
     */
    static forbidden() {
        return new Error("Forbidden", 403);
    }

    /**
     *
     * @returns {Error}
     */
    static requestTimeout() {
        return new Error("Request Timeout", 408);
    }

    /**
     * A generic error message,
     * given when an unexpected condition was encountered and no more specific message is suitable.
     * @returns {Error}
     */
    static internalServerError() {
        return new Error("Internal Server Error", 500);
    }

    /**
     * The requested resource could not be found but may be available in the future.
     * Subsequent requests by the client are permissible.
     * @returns {Error} Not Found, 404
     */
    static notFound() {
        return new Error("Not Found", 404);
    }

    /**
     * The 520 error is used as a "catch-all response for when the origin server returns something unexpected",
     * listing connection resets, large headers, and empty or invalid responses as common triggers.
     * @returns {Error} Unknown Error, 520
     */
    static unknownError() {
        return new Error("Unknown Error", 520);
    }

    /**
     * Unofficial HTTP Response.
     * This response is self reclaimed.
     * @returns {Error} User Exists, 420
     */
    static userExists() {
        return new Error("User Exists", 420);
    }

    /**
     * The request was well-formed but was unable to be followed due to semantic errors
     */
    static UnprocessableEntity(){
        return new Error("Unprocessable Entity", 422)
    }

    /**
     * The request was well-formed but was unable to be followed due to one or more conditions failing
     */
    static PreconditionFailed(){
        return new Error("Precondition Failed", 412)
    }
}

module.exports = Errors;