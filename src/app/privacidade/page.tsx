'use client';

import React from 'react';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';

export default function PrivacidadePage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-[800px] mx-auto px-6 py-12">
                <div className="mb-8">
                    <Link href="/vendas" className="inline-flex items-center gap-2 text-primary hover:underline mb-4"><FiArrowLeft /> Voltar</Link>
                    <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
                    <p className="text-text-muted">Última atualização: 06 de Janeiro de 2026</p>
                </div>

                <div className="prose prose-invert max-w-none">
                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">1. Introdução</h2><p className="text-text-secondary leading-relaxed">A Cola Aí está comprometida com a proteção da privacidade e dos dados pessoais de seus usuários. Esta Política de Privacidade foi elaborada em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018) e descreve como coletamos, usamos, armazenamos e protegemos suas informações.</p></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">2. Dados que Coletamos</h2><p className="text-text-secondary leading-relaxed mb-3">Coletamos os seguintes tipos de dados:</p><h3 className="text-lg font-medium mb-2 text-text-primary">2.1 Dados fornecidos por você:</h3><ul className="list-disc pl-6 text-text-secondary space-y-1 mb-4"><li>Nome completo e email (para criação de conta)</li><li>Dados do estabelecimento (nome, endereço, telefone)</li><li>Informações de produtos, pedidos e clientes inseridos na plataforma</li><li>Dados de pagamento (processados pelo Stripe)</li></ul><h3 className="text-lg font-medium mb-2 text-text-primary">2.2 Dados coletados automaticamente:</h3><ul className="list-disc pl-6 text-text-secondary space-y-1"><li>Endereço IP e informações do dispositivo</li><li>Dados de navegação e uso da plataforma</li><li>Cookies e tecnologias semelhantes</li></ul></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">3. Finalidade do Tratamento</h2><p className="text-text-secondary leading-relaxed mb-3">Utilizamos seus dados para as seguintes finalidades (Art. 7º da LGPD):</p><ul className="list-disc pl-6 text-text-secondary space-y-1"><li><strong>Execução do contrato:</strong> Fornecer acesso à plataforma e suas funcionalidades</li><li><strong>Comunicação:</strong> Enviar notificações sobre sua conta e atualizações do serviço</li><li><strong>Melhoria do serviço:</strong> Analisar uso para aprimorar a experiência</li><li><strong>Obrigações legais:</strong> Cumprir obrigações fiscais e regulatórias</li><li><strong>Segurança:</strong> Detectar e prevenir fraudes e atividades maliciosas</li></ul></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">4. Base Legal para o Tratamento</h2><p className="text-text-secondary leading-relaxed mb-3">O tratamento de seus dados pessoais é realizado com base nas seguintes hipóteses legais previstas na LGPD:</p><ul className="list-disc pl-6 text-text-secondary space-y-1"><li><strong>Consentimento (Art. 7º, I):</strong> Para comunicações de marketing</li><li><strong>Execução de contrato (Art. 7º, V):</strong> Para prestação dos serviços contratados</li><li><strong>Cumprimento de obrigação legal (Art. 7º, II):</strong> Para obrigações fiscais</li><li><strong>Legítimo interesse (Art. 7º, IX):</strong> Para melhorias e segurança da plataforma</li></ul></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">5. Compartilhamento de Dados</h2><p className="text-text-secondary leading-relaxed mb-3">Seus dados podem ser compartilhados com:</p><ul className="list-disc pl-6 text-text-secondary space-y-1 mb-3"><li><strong>Stripe:</strong> Processamento de pagamentos (conforme sua política de privacidade)</li><li><strong>Supabase:</strong> Armazenamento seguro de dados (servidores nos EUA)</li><li><strong>Autoridades legais:</strong> Quando exigido por lei ou ordem judicial</li></ul><p className="text-text-secondary">Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing.</p></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">6. Transferência Internacional de Dados</h2><p className="text-text-secondary leading-relaxed mb-3">Alguns de nossos prestadores de serviços estão localizados fora do Brasil (Supabase - EUA, Stripe - EUA). Essas transferências são realizadas com base no Art. 33 da LGPD, mediante:</p><ul className="list-disc pl-6 text-text-secondary space-y-1"><li>Cláusulas contratuais padrão de proteção de dados</li><li>Garantias de que o país de destino proporciona grau de proteção adequado</li></ul></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">7. Seus Direitos (Art. 18 da LGPD)</h2><p className="text-text-secondary leading-relaxed mb-3">Você tem os seguintes direitos em relação aos seus dados pessoais:</p><ul className="list-disc pl-6 text-text-secondary space-y-1 mb-3"><li><strong>Confirmação e acesso:</strong> Saber se tratamos seus dados e acessá-los</li><li><strong>Correção:</strong> Solicitar correção de dados incompletos ou desatualizados</li><li><strong>Anonimização ou eliminação:</strong> Solicitar exclusão de dados desnecessários</li><li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li><li><strong>Revogação do consentimento:</strong> Retirar seu consentimento a qualquer momento</li><li><strong>Oposição:</strong> Opor-se ao tratamento em determinadas situações</li><li><strong>Informação sobre compartilhamento:</strong> Saber com quem seus dados são compartilhados</li></ul><p className="text-text-secondary">Para exercer qualquer desses direitos, entre em contato através do email: <strong>privacidade@colaai.com.br</strong></p></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">8. Retenção de Dados</h2><p className="text-text-secondary leading-relaxed mb-3">Mantemos seus dados pelo período necessário para:</p><ul className="list-disc pl-6 text-text-secondary space-y-1 mb-3"><li>Prestação dos serviços contratados</li><li>Cumprimento de obrigações legais (5 anos para dados fiscais)</li><li>Exercício regular de direitos em processos judiciais</li></ul><p className="text-text-secondary">Após o encerramento da sua conta, seus dados serão anonimizados ou excluídos, exceto quando houver obrigação legal de retenção.</p></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">9. Segurança dos Dados</h2><p className="text-text-secondary leading-relaxed mb-3">Adotamos medidas técnicas e organizacionais para proteger seus dados:</p><ul className="list-disc pl-6 text-text-secondary space-y-1"><li>Criptografia de dados em trânsito (SSL/TLS) e em repouso</li><li>Controle de acesso restrito aos dados</li><li>Monitoramento contínuo de segurança</li><li>Backups automáticos diários</li><li>Políticas de senha forte</li></ul></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">10. Cookies</h2><p className="text-text-secondary leading-relaxed mb-3">Utilizamos cookies para:</p><ul className="list-disc pl-6 text-text-secondary space-y-1 mb-3"><li><strong>Cookies essenciais:</strong> Necessários para funcionamento da plataforma (autenticação)</li><li><strong>Cookies de desempenho:</strong> Análise de uso para melhoria do serviço</li></ul><p className="text-text-secondary">Você pode configurar seu navegador para recusar cookies, mas algumas funcionalidades podem não funcionar corretamente.</p></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">11. Alterações nesta Política</h2><p className="text-text-secondary leading-relaxed">Esta Política pode ser atualizada periodicamente. Notificaremos sobre alterações significativas por email ou através de aviso na Plataforma. Recomendamos revisar esta página regularmente.</p></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">12. Encarregado de Proteção de Dados (DPO)</h2><p className="text-text-secondary leading-relaxed mb-3">Conforme exigido pela LGPD, designamos um Encarregado de Proteção de Dados para atender suas solicitações e dúvidas:</p><ul className="list-disc pl-6 text-text-secondary"><li><strong>Email:</strong> dpo@colaai.com.br</li></ul></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">13. Autoridade Nacional de Proteção de Dados (ANPD)</h2><p className="text-text-secondary leading-relaxed mb-3">Se você acredita que o tratamento de seus dados pessoais viola a legislação de proteção de dados, você tem o direito de apresentar uma reclamação à Autoridade Nacional de Proteção de Dados (ANPD).</p><ul className="list-disc pl-6 text-text-secondary"><li><strong>Site:</strong> www.gov.br/anpd</li></ul></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">14. Contato</h2><p className="text-text-secondary leading-relaxed mb-3">Para dúvidas, solicitações ou reclamações sobre esta Política de Privacidade:</p><ul className="list-disc pl-6 text-text-secondary"><li><strong>Email geral:</strong> contato@colaai.com.br</li><li><strong>Email de privacidade:</strong> privacidade@colaai.com.br</li></ul></section>
                </div>

                <div className="flex items-center justify-center gap-4 pt-8 border-t border-border mt-8">
                    <Link href="/termos" className="text-primary hover:underline">Termos de Uso</Link>
                    <span className="text-text-muted">|</span>
                    <Link href="/vendas" className="text-primary hover:underline">Voltar ao Início</Link>
                </div>
            </div>
        </div>
    );
}
