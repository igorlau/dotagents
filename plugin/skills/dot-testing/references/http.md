# HTTP reference

HTTP test details for the [`dot-testing`](../SKILL.md) skill. Use them for controller, integration, and end-to-end tests.

## Order

Order the tests of each endpoint by the status code that they expect, from low to high: 200, 201, 400, 401, 403, 404, 409, 422, 500. When two tests expect the same status code, put the happy path first.

## Names

When the repository has no naming convention, name each test `should return {statusCode} when {conditions}`, such as `should return 404 when the user does not exist`.

## Dependencies

Integration and end-to-end tests run the real dependencies, such as the database and the HTTP server. Unit tests stub them through the doubles that `makeSut` returns.
