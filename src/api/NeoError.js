// See https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
function NeoError(err, q) {
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, NeoError);
  } else {
    this.stack = (new Error()).stack || '';
  }

  this.error = err.code;
  this.message = err.message;
  this.query = q;
}
NeoError.prototype = Object.create(Error.prototype);
NeoError.prototype.constructor = NeoError;

export default NeoError;
