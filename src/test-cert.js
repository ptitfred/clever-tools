const tls = require('node:tls');
const https = require('node:https');
const crypto = require('node:crypto');

function sha256 (s) {
  return crypto.createHash('sha256').update(s).digest('base64');
}

function testCert (hostname) {

  const options = {
    hostname: hostname,
    port: 443,
    path: '/',
    method: 'GET',
    checkServerIdentity: function (host, cert) {

      console.log(cert)

      console.log(host);
      console.log('  subject CN     :', cert.subject.CN);
      console.log('  issuer  C      :', cert.issuer.C);
      console.log('  issuer  ST      :', cert.issuer.ST);
      console.log('  issuer  ST      :', cert.issuer.ST);
      console.log('  issuer  L      :', cert.issuer.L);
      console.log('  issuer  O      :', cert.issuer.O);
      console.log('  issuer  CN     :', cert.issuer.CN);
      // console.log('  ', cert.infoAccess);
      console.log('  bits           :', cert.bits);
      console.log('  from           :', new Date(cert.valid_from).toISOString());
      console.log('  to             :', new Date(cert.valid_to).toISOString());
      console.log('  fingerprint    :', cert.fingerprint);
      console.log('  fingerprint 256:', cert.fingerprint256);

    },
  };

  options.agent = new https.Agent(options);
  const req = https.request(options, (res) => {
    // console.log('All OK. Server matched our pinned cert or public key');
    // // Print the HPKP values
    // console.log('headers:', res.headers['public-key-pins']);

    res.on('data', (d) => {
    });
  });

  req.on('error', (e) => {
    console.error(e.message);
  });
  req.end();

}

module.exports = {
  testCert,
};
