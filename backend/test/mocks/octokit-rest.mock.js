module.exports = {
    Octokit: class Octokit {
        constructor() {
            return {
                repos: {
                    get: jest.fn(),
                    createForAuthenticatedUser: jest.fn(),
                },
            };
        }
    },
};
