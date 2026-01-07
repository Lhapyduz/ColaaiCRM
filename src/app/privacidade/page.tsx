'use client';

import React from 'react';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import styles from './page.module.css';

export default function PrivacidadePage() {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Link href="/vendas" className={styles.backLink}>
                    <FiArrowLeft /> Voltar
                </Link>
                <h1>Política de Privacidade</h1>
                <p className={styles.lastUpdate}>Última atualização: 06 de Janeiro de 2026</p>
            </div>

            <div className={styles.content}>
                <section className={styles.section}>
                    <h2>1. Introdução</h2>
                    <p>
                        A Cola Aí está comprometida com a proteção da privacidade e dos dados pessoais
                        de seus usuários. Esta Política de Privacidade foi elaborada em conformidade com
                        a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018) e descreve
                        como coletamos, usamos, armazenamos e protegemos suas informações.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>2. Dados que Coletamos</h2>
                    <p>Coletamos os seguintes tipos de dados:</p>

                    <h3>2.1 Dados fornecidos por você:</h3>
                    <ul>
                        <li>Nome completo e email (para criação de conta)</li>
                        <li>Dados do estabelecimento (nome, endereço, telefone)</li>
                        <li>Informações de produtos, pedidos e clientes inseridos na plataforma</li>
                        <li>Dados de pagamento (processados pelo Stripe)</li>
                    </ul>

                    <h3>2.2 Dados coletados automaticamente:</h3>
                    <ul>
                        <li>Endereço IP e informações do dispositivo</li>
                        <li>Dados de navegação e uso da plataforma</li>
                        <li>Cookies e tecnologias semelhantes</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>3. Finalidade do Tratamento</h2>
                    <p>Utilizamos seus dados para as seguintes finalidades (Art. 7º da LGPD):</p>
                    <ul>
                        <li><strong>Execução do contrato:</strong> Fornecer acesso à plataforma e suas funcionalidades</li>
                        <li><strong>Comunicação:</strong> Enviar notificações sobre sua conta e atualizações do serviço</li>
                        <li><strong>Melhoria do serviço:</strong> Analisar uso para aprimorar a experiência</li>
                        <li><strong>Obrigações legais:</strong> Cumprir obrigações fiscais e regulatórias</li>
                        <li><strong>Segurança:</strong> Detectar e prevenir fraudes e atividades maliciosas</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>4. Base Legal para o Tratamento</h2>
                    <p>O tratamento de seus dados pessoais é realizado com base nas seguintes hipóteses legais previstas na LGPD:</p>
                    <ul>
                        <li><strong>Consentimento (Art. 7º, I):</strong> Para comunicações de marketing</li>
                        <li><strong>Execução de contrato (Art. 7º, V):</strong> Para prestação dos serviços contratados</li>
                        <li><strong>Cumprimento de obrigação legal (Art. 7º, II):</strong> Para obrigações fiscais</li>
                        <li><strong>Legítimo interesse (Art. 7º, IX):</strong> Para melhorias e segurança da plataforma</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>5. Compartilhamento de Dados</h2>
                    <p>Seus dados podem ser compartilhados com:</p>
                    <ul>
                        <li><strong>Stripe:</strong> Processamento de pagamentos (conforme sua política de privacidade)</li>
                        <li><strong>Supabase:</strong> Armazenamento seguro de dados (servidores nos EUA)</li>
                        <li><strong>Autoridades legais:</strong> Quando exigido por lei ou ordem judicial</li>
                    </ul>
                    <p>
                        Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros
                        para fins de marketing.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>6. Transferência Internacional de Dados</h2>
                    <p>
                        Alguns de nossos prestadores de serviços estão localizados fora do Brasil
                        (Supabase - EUA, Stripe - EUA). Essas transferências são realizadas com base
                        no Art. 33 da LGPD, mediante:
                    </p>
                    <ul>
                        <li>Cláusulas contratuais padrão de proteção de dados</li>
                        <li>Garantias de que o país de destino proporciona grau de proteção adequado</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>7. Seus Direitos (Art. 18 da LGPD)</h2>
                    <p>Você tem os seguintes direitos em relação aos seus dados pessoais:</p>
                    <ul>
                        <li><strong>Confirmação e acesso:</strong> Saber se tratamos seus dados e acessá-los</li>
                        <li><strong>Correção:</strong> Solicitar correção de dados incompletos ou desatualizados</li>
                        <li><strong>Anonimização ou eliminação:</strong> Solicitar exclusão de dados desnecessários</li>
                        <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
                        <li><strong>Revogação do consentimento:</strong> Retirar seu consentimento a qualquer momento</li>
                        <li><strong>Oposição:</strong> Opor-se ao tratamento em determinadas situações</li>
                        <li><strong>Informação sobre compartilhamento:</strong> Saber com quem seus dados são compartilhados</li>
                    </ul>
                    <p>
                        Para exercer qualquer desses direitos, entre em contato através do email:
                        <strong> privacidade@colaai.com.br</strong>
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>8. Retenção de Dados</h2>
                    <p>Mantemos seus dados pelo período necessário para:</p>
                    <ul>
                        <li>Prestação dos serviços contratados</li>
                        <li>Cumprimento de obrigações legais (5 anos para dados fiscais)</li>
                        <li>Exercício regular de direitos em processos judiciais</li>
                    </ul>
                    <p>
                        Após o encerramento da sua conta, seus dados serão anonimizados ou excluídos,
                        exceto quando houver obrigação legal de retenção.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>9. Segurança dos Dados</h2>
                    <p>Adotamos medidas técnicas e organizacionais para proteger seus dados:</p>
                    <ul>
                        <li>Criptografia de dados em trânsito (SSL/TLS) e em repouso</li>
                        <li>Controle de acesso restrito aos dados</li>
                        <li>Monitoramento contínuo de segurança</li>
                        <li>Backups automáticos diários</li>
                        <li>Políticas de senha forte</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>10. Cookies</h2>
                    <p>Utilizamos cookies para:</p>
                    <ul>
                        <li><strong>Cookies essenciais:</strong> Necessários para funcionamento da plataforma (autenticação)</li>
                        <li><strong>Cookies de desempenho:</strong> Análise de uso para melhoria do serviço</li>
                    </ul>
                    <p>
                        Você pode configurar seu navegador para recusar cookies, mas algumas
                        funcionalidades podem não funcionar corretamente.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>11. Alterações nesta Política</h2>
                    <p>
                        Esta Política pode ser atualizada periodicamente. Notificaremos sobre
                        alterações significativas por email ou através de aviso na Plataforma.
                        Recomendamos revisar esta página regularmente.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>12. Encarregado de Proteção de Dados (DPO)</h2>
                    <p>
                        Conforme exigido pela LGPD, designamos um Encarregado de Proteção de Dados
                        para atender suas solicitações e dúvidas:
                    </p>
                    <ul>
                        <li><strong>Email:</strong> dpo@colaai.com.br</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>13. Autoridade Nacional de Proteção de Dados (ANPD)</h2>
                    <p>
                        Se você acredita que o tratamento de seus dados pessoais viola a legislação
                        de proteção de dados, você tem o direito de apresentar uma reclamação à
                        Autoridade Nacional de Proteção de Dados (ANPD).
                    </p>
                    <ul>
                        <li><strong>Site:</strong> www.gov.br/anpd</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>14. Contato</h2>
                    <p>
                        Para dúvidas, solicitações ou reclamações sobre esta Política de Privacidade:
                    </p>
                    <ul>
                        <li><strong>Email geral:</strong> contato@colaai.com.br</li>
                        <li><strong>Email de privacidade:</strong> privacidade@colaai.com.br</li>
                    </ul>
                </section>
            </div>

            <div className={styles.footer}>
                <Link href="/termos" className={styles.footerLink}>
                    Termos de Uso
                </Link>
                <span className={styles.separator}>|</span>
                <Link href="/vendas" className={styles.footerLink}>
                    Voltar ao Início
                </Link>
            </div>
        </div>
    );
}
