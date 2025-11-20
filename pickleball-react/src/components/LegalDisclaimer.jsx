import React from 'react';

export default function LegalDisclaimer() {
  return (
    <section className="card span-all" style={{ background: '#fff3cd', borderColor: '#ffeaa7' }}>
      <h2 style={{ color: '#856404' }}>⚠️ Legal Disclaimer</h2>
      <div className="section" style={{ color: '#856404', fontSize: '12px', lineHeight: '1.4' }}>
        <strong>USE AT YOUR OWN RISK</strong><br /><br />
        This software is provided "as is" without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.<br /><br />
        The user assumes all responsibility and liability for the use of this application. The developers make no guarantees about the accuracy, reliability, or suitability of this software for any particular purpose. Use of this application is entirely at your own risk.
      </div>
    </section>
  );
}

